// ByteTrack Lightweight Multi-Object Tracker for Real-Time Video Surveillance
// Follows ByteTrack two-stage data association paradigm:
// Stage 1: Match high-confidence detections with active tracks using IoU
// Stage 2: Match remaining tracks with secondary detections to prevent track fragmentation

import { TrackedObject, RestrictedZoneConfig } from "../types";

export interface RawDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0..1
  center: [number, number];
}

interface InternalTrack {
  id: number;
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
  center: [number, number];
  firstSeen: number;
  lastSeen: number;
  lostFrames: number;
  dwellTimeSeconds: number;
  inRestrictedZone: boolean;
  zoneDwellSeconds: number;
  trajectory: [number, number][];
  color: string;
  hasTriggeredIntrusionIncident: boolean;
  hasTriggeredLoiteringIncident: boolean;
  velocity: number; // Normalized coordinate distance per second
}

const PALETTE = [
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#6366f1", // indigo
];

export class ByteTracker {
  private activeTracks: Map<number, InternalTrack> = new Map();
  private nextId = 1;
  private maxLostFrames = 25; // ~1-1.5 seconds at 20-30 FPS
  private iouThreshold = 0.25;

  /**
   * Calculates Intersection over Union (IoU) between two bounding boxes [x, y, w, h]
   */
  private computeIoU(
    a: [number, number, number, number],
    b: [number, number, number, number]
  ): number {
    const ax1 = a[0];
    const ay1 = a[1];
    const ax2 = a[0] + a[2];
    const ay2 = a[1] + a[3];

    const bx1 = b[0];
    const by1 = b[1];
    const bx2 = b[0] + b[2];
    const by2 = b[1] + b[3];

    const ix1 = Math.max(ax1, bx1);
    const iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2);
    const iy2 = Math.min(ay2, by2);

    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    const intersectionArea = iw * ih;

    const areaA = a[2] * a[3];
    const areaB = b[2] * b[3];
    const unionArea = areaA + areaB - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Checks if bottom-center or center of bounding box falls within restricted zone
   */
  private isInsideZone(
    bbox: [number, number, number, number],
    zone: RestrictedZoneConfig
  ): boolean {
    const cx = bbox[0] + bbox[2] * 0.5;
    // Ground contact point (feet level at ~85% of height) and centroid
    const groundY = bbox[1] + bbox[3] * 0.85;
    const cy = bbox[1] + bbox[3] * 0.5;

    const insideGround =
      cx >= zone.x &&
      cx <= zone.x + zone.width &&
      groundY >= zone.y &&
      groundY <= zone.y + zone.height;

    const insideCenter =
      cx >= zone.x &&
      cx <= zone.x + zone.width &&
      cy >= zone.y &&
      cy <= zone.y + zone.height;

    return insideGround || insideCenter;
  }

  /**
   * Updates tracks with new frame detections
   */
  public update(
    detections: RawDetection[],
    zone: RestrictedZoneConfig,
    dtSeconds = 0.1
  ): TrackedObject[] {
    const now = Date.now();

    // 1. Split detections into high confidence (>= 0.6) and low confidence (< 0.6)
    const highDets: { det: RawDetection; matched: boolean }[] = [];
    const lowDets: { det: RawDetection; matched: boolean }[] = [];

    detections.forEach((d) => {
      if (d.confidence >= 0.55) {
        highDets.push({ det: d, matched: false });
      } else {
        lowDets.push({ det: d, matched: false });
      }
    });

    const trackIds = Array.from(this.activeTracks.keys());
    const matchedTrackIds = new Set<number>();

    // Stage 1: Match active tracks with high-confidence detections
    for (const trackId of trackIds) {
      const track = this.activeTracks.get(trackId);
      if (!track) continue;

      let bestIoU = 0;
      let bestIndex = -1;

      highDets.forEach((item, idx) => {
        if (item.matched) return;
        // Same label match preferred
        if (item.det.label !== track.label) return;

        const iou = this.computeIoU(track.bbox, item.det.bbox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestIndex = idx;
        }
      });

      if (bestIoU >= this.iouThreshold && bestIndex >= 0) {
        // High confidence match found
        const match = highDets[bestIndex].det;
        highDets[bestIndex].matched = true;
        matchedTrackIds.add(trackId);

        // Smooth bounding box (exponential moving average for stable rendering)
        track.bbox = [
          track.bbox[0] * 0.3 + match.bbox[0] * 0.7,
          track.bbox[1] * 0.3 + match.bbox[1] * 0.7,
          track.bbox[2] * 0.3 + match.bbox[2] * 0.7,
          track.bbox[3] * 0.3 + match.bbox[3] * 0.7,
        ];
        const prevCenter = track.center;
        track.center = [
          track.bbox[0] + track.bbox[2] * 0.5,
          track.bbox[1] + track.bbox[3] * 0.5,
        ];
        const dx = track.center[0] - prevCenter[0];
        const dy = track.center[1] - prevCenter[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const instantSpeed = dtSeconds > 0 ? dist / dtSeconds : 0;
        track.velocity = track.velocity * 0.3 + instantSpeed * 0.7;

        track.confidence = match.confidence;
        track.lastSeen = now;
        track.lostFrames = 0;
        track.dwellTimeSeconds += dtSeconds;

        // Zone analysis: PERSON ONLY! Non-person objects (coolers, chairs, tables) NEVER breach zone
        if (track.label === "person") {
          const inZone = this.isInsideZone(track.bbox, zone);
          track.inRestrictedZone = inZone;
          if (inZone) {
            track.zoneDwellSeconds += dtSeconds;
          } else {
            track.zoneDwellSeconds = 0; // Immediate reset when outside zone
          }
        } else {
          track.inRestrictedZone = false;
          track.zoneDwellSeconds = 0;
        }

        // Add to trajectory (keep last 16 points)
        track.trajectory.push(track.center);
        if (track.trajectory.length > 16) {
          track.trajectory.shift();
        }
      }
    }

    // Stage 2: Match remaining unmatched tracks with lower-confidence detections
    for (const trackId of trackIds) {
      if (matchedTrackIds.has(trackId)) continue;
      const track = this.activeTracks.get(trackId);
      if (!track) continue;

      let bestIoU = 0;
      let bestIndex = -1;

      lowDets.forEach((item, idx) => {
        if (item.matched) return;
        if (item.det.label !== track.label) return;

        const iou = this.computeIoU(track.bbox, item.det.bbox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestIndex = idx;
        }
      });

      if (bestIoU >= this.iouThreshold * 0.7 && bestIndex >= 0) {
        const match = lowDets[bestIndex].det;
        lowDets[bestIndex].matched = true;
        matchedTrackIds.add(trackId);

        const prevCenter = track.center;
        track.bbox = match.bbox;
        track.center = match.center;
        const dx = track.center[0] - prevCenter[0];
        const dy = track.center[1] - prevCenter[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const instantSpeed = dtSeconds > 0 ? dist / dtSeconds : 0;
        track.velocity = track.velocity * 0.3 + instantSpeed * 0.7;

        track.confidence = match.confidence;
        track.lastSeen = now;
        track.lostFrames = 0;
        track.dwellTimeSeconds += dtSeconds;

        if (track.label === "person") {
          const inZone = this.isInsideZone(track.bbox, zone);
          track.inRestrictedZone = inZone;
          if (inZone) {
            track.zoneDwellSeconds += dtSeconds;
          } else {
            track.zoneDwellSeconds = 0;
          }
        } else {
          track.inRestrictedZone = false;
          track.zoneDwellSeconds = 0;
        }

        track.trajectory.push(track.center);
        if (track.trajectory.length > 16) track.trajectory.shift();
      }
    }

    // Increment lostFrames for unmatched tracks & cleanup dead tracks
    for (const trackId of trackIds) {
      if (!matchedTrackIds.has(trackId)) {
        const track = this.activeTracks.get(trackId);
        if (track) {
          track.lostFrames += 1;
          if (track.lostFrames > this.maxLostFrames) {
            this.activeTracks.delete(trackId);
          }
        }
      }
    }

    // Initialize new tracks for unmatched high-confidence detections
    highDets.forEach(({ det, matched }) => {
      if (!matched) {
        const newId = this.nextId++;
        const isPerson = det.label === "person";
        const inZone = isPerson && this.isInsideZone(det.bbox, zone);
        const color = PALETTE[(newId - 1) % PALETTE.length];

        const newTrack: InternalTrack = {
          id: newId,
          label: det.label,
          confidence: det.confidence,
          bbox: det.bbox,
          center: det.center,
          firstSeen: now,
          lastSeen: now,
          lostFrames: 0,
          dwellTimeSeconds: dtSeconds,
          inRestrictedZone: inZone,
          zoneDwellSeconds: inZone ? dtSeconds : 0,
          trajectory: [det.center],
          color,
          hasTriggeredIntrusionIncident: false,
          hasTriggeredLoiteringIncident: false,
          velocity: 0,
        };

        this.activeTracks.set(newId, newTrack);
      }
    });

    // Return active tracks formatted as TrackedObject
    const output: TrackedObject[] = [];
    this.activeTracks.forEach((track) => {
      if (track.lostFrames <= 4) {
        output.push({
          id: track.id,
          label: track.label,
          confidence: Math.round(track.confidence * 100),
          bbox: track.bbox,
          center: track.center,
          firstSeen: track.firstSeen,
          lastSeen: track.lastSeen,
          dwellTimeSeconds: Math.round(track.dwellTimeSeconds * 10) / 10,
          inRestrictedZone: track.inRestrictedZone,
          zoneDwellSeconds: Math.round(track.zoneDwellSeconds * 10) / 10,
          trajectory: track.trajectory,
          color: track.color,
          hasTriggeredIntrusionIncident: track.hasTriggeredIntrusionIncident,
          hasTriggeredLoiteringIncident: track.hasTriggeredLoiteringIncident,
          velocity: Math.round(track.velocity * 100) / 100,
        });
      }
    });

    return output;
  }

  /**
   * Mark a track ID as having triggered an incident so duplicate incidents aren't spammed
   */
  public markIntrusionTriggered(trackId: number) {
    const track = this.activeTracks.get(trackId);
    if (track) {
      track.hasTriggeredIntrusionIncident = true;
    }
  }

  public markLoiteringTriggered(trackId: number) {
    const track = this.activeTracks.get(trackId);
    if (track) {
      track.hasTriggeredLoiteringIncident = true;
    }
  }

  public reset() {
    this.activeTracks.clear();
  }
}
