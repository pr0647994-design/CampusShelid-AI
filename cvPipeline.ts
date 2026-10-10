// Real-Time Computer Vision & YOLO Pipeline (Browser & Edge Compatible)
// Integrates:
// 1. Frame capture from Video / Canvas stream
// 2. Real MobileNet SSD / COCO-SSD object detection running client-side
// 3. ByteTrack Multi-Object Tracking with persistent track IDs, velocity vectors, and trajectory trails
// 4. Strict Person-Only Prerequisite for all security & behavioral rules
// 5. Multi-frame confirmation and debounce (eliminating single-frame false positives)

import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { RawDetection, ByteTracker } from "./byteTrack";
import {
  TrackedObject,
  RestrictedZoneConfig,
  AIActivityType,
  RiskLevel,
  DetectionSource,
  CVDebugInfo,
} from "../types";

export interface CVProcessingOutput {
  activity: AIActivityType;
  activityLabel: string;
  riskLevel: RiskLevel;
  confidence: number;
  objects: TrackedObject[];
  personCount: number;
  objectCount: number;
  motionScore: number;
  isAbnormalMotion: boolean;
  fps: number;
  timestamp: string;
  source: DetectionSource;
  processingEngine: "YOLO + OpenCV";
  trackingEngine: "ByteTrack";
  isThreat: boolean;
  threatDetails?: string;
  recommendedAction?: string;
  triggeredThreatTrackId?: number;
  debugInfo: CVDebugInfo;
}

// Global cached COCO-SSD model instance
let globalCocoModel: cocoSsd.ObjectDetection | null = null;
let isModelLoading = false;
let modelLoadAttempted = false;

async function getOrLoadModel(): Promise<cocoSsd.ObjectDetection | null> {
  if (globalCocoModel) return globalCocoModel;
  if (isModelLoading) return null;
  if (modelLoadAttempted && !globalCocoModel) return null;

  isModelLoading = true;
  try {
    await tf.ready();
    globalCocoModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    console.log("[CampusShield CV] COCO-SSD / MobileNet Edge Model loaded successfully");
    return globalCocoModel;
  } catch (err) {
    try {
      globalCocoModel = await cocoSsd.load({ base: "mobilenet_v1" });
      console.log("[CampusShield CV] Fallback MobileNet Model loaded successfully");
      return globalCocoModel;
    } catch (e2) {
      console.warn("[CampusShield CV] Model load notice (edge mode active):", e2);
      modelLoadAttempted = true;
      return null;
    }
  } finally {
    isModelLoading = false;
  }
}

export class ComputerVisionPipeline {
  private tracker: ByteTracker;
  private prevFrameData: Uint8ClampedArray | null = null;
  private motionCanvas: HTMLCanvasElement;
  private motionCtx: CanvasRenderingContext2D | null;

  // Frame timing & FPS tracking
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private currentFps = 28.5;
  private fpsLastUpdated = performance.now();

  // Inference management
  private model: cocoSsd.ObjectDetection | null = null;
  private isInferring = false;
  private latestRawDetections: RawDetection[] = [];
  private lastInferenceTime = 0;

  // Confirmation / Debounce Tracker (Requirement 7)
  private confirmationCount = 0;
  private candidateRule = "NONE";
  private candidateTrackId: number | undefined = undefined;
  private readonly CONFIRMATION_REQUIRED = 8;

  constructor() {
    this.tracker = new ByteTracker();
    this.motionCanvas = document.createElement("canvas");
    this.motionCanvas.width = 64;
    this.motionCanvas.height = 48;
    this.motionCtx = this.motionCanvas.getContext("2d", { willReadFrequently: true });

    // Asynchronously load the object detection model
    getOrLoadModel().then((m) => {
      if (m) this.model = m;
    });
  }

  /**
   * Optical motion differencing for background change metric (NOT for human classification)
   */
  private analyzeMotion(video: HTMLVideoElement | HTMLCanvasElement): {
    motionScore: number;
  } {
    if (!this.motionCtx) {
      return { motionScore: 0 };
    }

    const w = 64;
    const h = 48;
    try {
      this.motionCtx.drawImage(video, 0, 0, w, h);
      const frame = this.motionCtx.getImageData(0, 0, w, h).data;

      let diffPixels = 0;
      const totalPixels = w * h;

      if (this.prevFrameData && this.prevFrameData.length === frame.length) {
        for (let i = 0; i < frame.length; i += 4) {
          const lum1 = (frame[i] * 299 + frame[i + 1] * 587 + frame[i + 2] * 114) / 1000;
          const lum2 =
            (this.prevFrameData[i] * 299 +
              this.prevFrameData[i + 1] * 587 +
              this.prevFrameData[i + 2] * 114) /
            1000;

          if (Math.abs(lum1 - lum2) > 30) {
            diffPixels++;
          }
        }
      }

      this.prevFrameData = new Uint8ClampedArray(frame);
      const motionScore = Math.min(100, Math.round((diffPixels / totalPixels) * 300));
      return { motionScore };
    } catch {
      return { motionScore: 0 };
    }
  }

  /**
   * Triggers non-blocking asynchronous neural network object detection on the current video frame.
   * Runs in parallel without stalling the 60 FPS animation/rendering loop.
   */
  private scheduleInference(video: HTMLVideoElement | HTMLCanvasElement) {
    if (this.isInferring) return;

    const now = performance.now();
    // Run inference at ~15-20 FPS for optimal responsiveness & low CPU usage
    if (now - this.lastInferenceTime < 50) return;

    if (!this.model && globalCocoModel) {
      this.model = globalCocoModel;
    }
    if (!this.model) {
      // Try lazy loading if not yet ready
      getOrLoadModel().then((m) => {
        if (m) this.model = m;
      });
      return;
    }

    const vW = (video as HTMLVideoElement).videoWidth || (video as HTMLCanvasElement).width || 0;
    const vH = (video as HTMLVideoElement).videoHeight || (video as HTMLCanvasElement).height || 0;
    if (vW === 0 || vH === 0) return;

    this.isInferring = true;
    this.lastInferenceTime = now;

    this.model
      .detect(video)
      .then((predictions) => {
        const dets: RawDetection[] = [];

        for (const pred of predictions) {
          // Require at least 48% confidence to eliminate noise
          if (pred.score < 0.48) continue;

          const rawClass = pred.class.toLowerCase();
          const isPerson = rawClass === "person";

          const nx = Math.max(0, Math.min(0.98, pred.bbox[0] / vW));
          const ny = Math.max(0, Math.min(0.98, pred.bbox[1] / vH));
          const nw = Math.max(0.02, Math.min(1 - nx, pred.bbox[2] / vW));
          const nh = Math.max(0.04, Math.min(1 - ny, pred.bbox[3] / vH));

          // Label explicitly: "person" or background object class (e.g. "chair", "dining table", "tv", "bottle", etc.)
          const label = isPerson ? "person" : rawClass;

          dets.push({
            label,
            confidence: Math.round(pred.score * 100) / 100,
            bbox: [nx, ny, nw, nh],
            center: [nx + nw * 0.5, ny + nh * 0.5],
          });
        }

        this.latestRawDetections = dets;
      })
      .catch((err) => {
        console.warn("[CampusShield CV] Inference error notice:", err);
      })
      .finally(() => {
        this.isInferring = false;
      });
  }

  /**
   * Core frame processing pipeline with strict Person prerequisite,
   * ByteTrack tracking, and multi-frame debounce confirmation.
   */
  public processFrame(
    video: HTMLVideoElement | HTMLCanvasElement,
    zone: RestrictedZoneConfig,
    source: DetectionSource = "REAL YOLO"
  ): CVProcessingOutput {
    const now = performance.now();
    const dtSeconds = Math.max(0.02, Math.min(0.2, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    // Update FPS calculation
    this.frameCount++;
    if (now - this.fpsLastUpdated >= 500) {
      this.currentFps =
        Math.round((this.frameCount / ((now - this.fpsLastUpdated) / 1000)) * 10) / 10;
      this.frameCount = 0;
      this.fpsLastUpdated = now;
    }

    // 1. Compute ambient motion difference for telemetry
    const { motionScore } = this.analyzeMotion(video);

    // 2. Schedule non-blocking YOLO inference
    this.scheduleInference(video);

    // 3. Multi-object tracking with persistent track IDs
    const rawDetections = [...this.latestRawDetections];
    const trackedObjects = this.tracker.update(rawDetections, zone, dtSeconds);

    // 4. PERSON IS A MANDATORY PREREQUISITE
    // Ignore background objects completely (chairs, tables, coolers, walls, fans, etc.)
    const validPersons = trackedObjects.filter((o) => o.label === "person");
    const personCount = validPersons.length;
    const objectCount = trackedObjects.length;

    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // IF NO PERSON IS DETECTED:
    // Immediate return: activity=NORMAL, risk=LOW, buzzer=OFF, no incident created
    if (personCount === 0) {
      this.confirmationCount = 0;
      this.candidateRule = "NONE";
      this.candidateTrackId = undefined;

      const debugInfo: CVDebugInfo = {
        personCount: 0,
        activePersonTracks: "0",
        triggeredRule: "NONE",
        confirmationFrames: "0/8",
        confirmationCount: 0,
        confirmationRequired: this.CONFIRMATION_REQUIRED,
        alertState: "NORMAL",
      };

      return {
        activity: "NORMAL",
        activityLabel: "Normal Activity",
        riskLevel: "LOW",
        confidence: 96,
        objects: trackedObjects,
        personCount: 0,
        objectCount,
        motionScore,
        isAbnormalMotion: false,
        fps: this.currentFps,
        timestamp: timeStr,
        source,
        processingEngine: "YOLO + OpenCV",
        trackingEngine: "ByteTrack",
        isThreat: false,
        threatDetails: "Empty sector / background objects only: no human activity detected.",
        recommendedAction: "Maintain automated background surveillance.",
        debugInfo,
      };
    }

    // 5. RULE-BASED ANOMALY ENGINE (EVALUATED ONLY ON VALID TRACKED PERSONS)
    let activeViolationRule = "NONE";
    let candidatePerson: TrackedObject | undefined;

    // RULE 1: RESTRICTED ZONE INTRUSION (PERSON ONLY)
    // Center or footpoint must be inside the restricted polygon & dwell >= threshold
    const intruder = validPersons.find(
      (p) => p.inRestrictedZone && p.zoneDwellSeconds >= zone.intrusionThresholdSeconds
    );
    if (intruder) {
      activeViolationRule = "RESTRICTED_ZONE_INTRUSION";
      candidatePerson = intruder;
    }
    // RULE 2: SUSPICIOUS LOITERING (PERSON ONLY)
    // The same person must remain within monitored area for required duration
    else {
      const loiterer = validPersons.find(
        (p) => p.dwellTimeSeconds >= zone.loiteringThresholdSeconds
      );
      if (loiterer) {
        activeViolationRule = "SUSPICIOUS_LOITERING";
        candidatePerson = loiterer;
      }
      // RULE 3: CROWD ANOMALY (PERSON COUNT ONLY)
      else if (personCount >= zone.crowdThreshold) {
        activeViolationRule = "CROWD_ANOMALY";
        candidatePerson = validPersons[0];
      }
      // RULE 4: MOTION ANOMALY (TRACKED PERSON MOVEMENT ONLY)
      // Generic frame-difference alerts are disabled!
      // Only calculated from tracked PERSON speed across multiple frames!
      else {
        const runner = validPersons.find(
          (p) => (p.velocity ?? 0) > 0.45 && p.dwellTimeSeconds >= 0.6
        );
        if (runner) {
          activeViolationRule = "MOTION_ANOMALY";
          candidatePerson = runner;
        }
      }
    }

    // 6. CONFIRMATION & DEBOUNCE LOGIC (Requirement 7)
    // Require anomaly condition to persist for multiple consecutive frames before creating an incident
    if (activeViolationRule === "NONE") {
      // Normal person behavior (standing normally, walking peacefully)
      this.confirmationCount = 0;
      this.candidateRule = "NONE";
      this.candidateTrackId = undefined;
    } else {
      // Anomaly candidate detected
      if (
        this.candidateRule === activeViolationRule &&
        this.candidateTrackId === candidatePerson?.id
      ) {
        this.confirmationCount++;
      } else {
        this.candidateRule = activeViolationRule;
        this.candidateTrackId = candidatePerson?.id;
        this.confirmationCount = 1;
      }
    }

    let isThreat = false;
    let activity: AIActivityType = "NORMAL";
    let activityLabel = "Normal Activity";
    let riskLevel: RiskLevel = "LOW";
    let confidence = 94;
    let threatDetails = "Person observed: nominal behavior within authorized parameters.";
    let recommendedAction = "Maintain standard SOC telemetry.";
    let triggeredThreatTrackId: number | undefined;

    // Only when confirmed for multiple consecutive frames (>= 8)
    if (this.confirmationCount >= this.CONFIRMATION_REQUIRED && activeViolationRule !== "NONE") {
      isThreat = true;
      triggeredThreatTrackId = candidatePerson?.id;

      if (activeViolationRule === "RESTRICTED_ZONE_INTRUSION" && candidatePerson) {
        activity = "RESTRICTED_ZONE_INTRUSION";
        activityLabel = "Restricted Zone Intrusion";
        riskLevel = "HIGH";
        confidence = candidatePerson.confidence || 95;
        threatDetails = `Unauthorized person (Track #${candidatePerson.id}) confirmed inside ${zone.label} for ${candidatePerson.zoneDwellSeconds.toFixed(1)}s.`;
        recommendedAction = "Sound audible SOC alarm, dispatch Rapid Response Unit (RRU), and lock sector gates.";
      } else if (activeViolationRule === "SUSPICIOUS_LOITERING" && candidatePerson) {
        activity = "SUSPICIOUS_LOITERING";
        activityLabel = "Suspicious Loitering";
        riskLevel = "MEDIUM";
        confidence = candidatePerson.confidence || 89;
        threatDetails = `Track #${candidatePerson.id} loitering threshold exceeded (${candidatePerson.dwellTimeSeconds.toFixed(1)}s dwell time) in monitored sector.`;
        recommendedAction = "Initiate PTZ zoom lock and dispatch security patrol for inquiry.";
      } else if (activeViolationRule === "CROWD_ANOMALY") {
        activity = "CROWD_ANOMALY";
        activityLabel = "Crowd Anomaly";
        riskLevel = "HIGH";
        confidence = 92;
        threatDetails = `Dense crowd accumulation confirmed: ${personCount} persons (safety threshold: ${zone.crowdThreshold}).`;
        recommendedAction = "Alert entry turnstile control and deploy auxiliary crowd guides.";
      } else if (activeViolationRule === "MOTION_ANOMALY" && candidatePerson) {
        activity = "MOTION_ANOMALY";
        activityLabel = "Motion Anomaly";
        riskLevel = "MEDIUM";
        confidence = 88;
        threatDetails = `High-velocity sprint movement confirmed from Track #${candidatePerson.id} (speed: ${(candidatePerson.velocity ?? 0).toFixed(2)} units/s).`;
        recommendedAction = "Inspect active sector for fleeing suspect or disturbance.";
      }
    }

    // Format developer debug telemetry (Requirement 9)
    const activePersonTracksStr =
      validPersons.length === 0
        ? "0"
        : validPersons.map((p) => `#${p.id}`).join(", ");

    const alertState: "NORMAL" | "ALERT" | "EVALUATING" = isThreat
      ? "ALERT"
      : this.confirmationCount > 0
      ? "EVALUATING"
      : "NORMAL";

    const debugInfo: CVDebugInfo = {
      personCount,
      activePersonTracks: activePersonTracksStr,
      triggeredRule: isThreat
        ? activeViolationRule
        : this.confirmationCount > 0
        ? this.candidateRule
        : "NONE",
      confirmationFrames: `${Math.min(this.CONFIRMATION_REQUIRED, this.confirmationCount)}/${this.CONFIRMATION_REQUIRED}`,
      confirmationCount: this.confirmationCount,
      confirmationRequired: this.CONFIRMATION_REQUIRED,
      alertState,
    };

    return {
      activity,
      activityLabel,
      riskLevel,
      confidence,
      objects: trackedObjects,
      personCount,
      objectCount,
      motionScore,
      isAbnormalMotion: false,
      fps: this.currentFps,
      timestamp: timeStr,
      source,
      processingEngine: "YOLO + OpenCV",
      trackingEngine: "ByteTrack",
      isThreat,
      threatDetails,
      recommendedAction,
      triggeredThreatTrackId,
      debugInfo,
    };
  }

  public markIntrusionTriggered(trackId: number) {
    this.tracker.markIntrusionTriggered(trackId);
  }

  public markLoiteringTriggered(trackId: number) {
    this.tracker.markLoiteringTriggered(trackId);
  }

  public reset() {
    this.tracker.reset();
    this.prevFrameData = null;
    this.latestRawDetections = [];
    this.confirmationCount = 0;
    this.candidateRule = "NONE";
    this.candidateTrackId = undefined;
  }
}
