export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus = "ACTIVE" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";

export type DetectionCategory =
  | "Person Detection"
  | "Vehicle Detection"
  | "Restricted Zone Intrusion"
  | "Suspicious Loitering"
  | "Suspicious Activity"
  | "Crowd Anomaly"
  | "Motion Anomaly"
  | "Possible Violence"
  | "Object Detection";

export type AIActivityType =
  | "NORMAL"
  | "RESTRICTED_ZONE_INTRUSION"
  | "SUSPICIOUS_LOITERING"
  | "CROWD_ANOMALY"
  | "MOTION_ANOMALY"
  | "SUSPICIOUS_ACTIVITY"
  | "POSSIBLE_VIOLENCE"
  | "UNKNOWN";

export type DetectionSource = "REAL YOLO" | "DEMO SIMULATION" | "GEMINI_VISION";

export interface TrackedObject {
  id: number;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0..1
  center: [number, number]; // [cx, cy]
  firstSeen: number;
  lastSeen: number;
  dwellTimeSeconds: number;
  inRestrictedZone: boolean;
  zoneDwellSeconds: number;
  trajectory?: [number, number][];
  color?: string;
  hasTriggeredIntrusionIncident?: boolean;
  hasTriggeredLoiteringIncident?: boolean;
  velocity?: number;
}

export interface RestrictedZoneConfig {
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
  label: string;
  intrusionThresholdSeconds: number;
  loiteringThresholdSeconds: number;
  crowdThreshold: number;
}

export interface CVDebugInfo {
  personCount: number;
  activePersonTracks: string;
  triggeredRule: string;
  confirmationFrames: string;
  confirmationCount: number;
  confirmationRequired: number;
  alertState: "NORMAL" | "ALERT" | "EVALUATING";
}

export interface YOLODetectionResult {
  activity: AIActivityType;
  activityLabel: string;
  riskLevel: RiskLevel;
  confidence: number;
  objects: TrackedObject[];
  personCount: number;
  objectCount: number;
  motionScore: number;
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

export interface FrameAnalysisResult {
  activity: AIActivityType;
  riskLevel: RiskLevel;
  confidence: number;
  description: string;
  recommendedAction: string;
  timestamp?: string;
  isRealAI?: boolean;
}

export interface AnalysisLogEntry {
  id: string;
  timestamp: string; // e.g. "23:45:02"
  activity: AIActivityType;
  confidence: number;
  riskLevel: RiskLevel;
  description: string;
  source: DetectionSource;
  trackId?: number;
}

export interface AISecurityAlert {
  id: string;
  activity: AIActivityType;
  activityLabel: string;
  confidence: number;
  riskLevel: RiskLevel;
  timestamp: string;
  description: string;
  recommendedAction: string;
  cameraName: string;
  location: string;
  source: DetectionSource;
  trackId?: number;
}

export interface CameraData {
  id: string; // e.g. "CAM-01"
  name: string; // "Camera 01 — Main Gate"
  shortName: string; // "Camera 01"
  location: string; // "Main Gate"
  zoneId: string; // "main-gate"
  status: "ONLINE" | "OFFLINE" | "WARNING";
  peopleCount: number;
  vehicleCount: number;
  riskLevel: RiskLevel;
  detectionStatus: string;
  fps: number;
  bitrate: string;
  resolution: string;
  feedType: "simulated" | "webcam" | "uploaded";
  videoUrl?: string;
  isRestrictedZone?: boolean;
}

export interface Incident {
  id: string; // e.g. "INC-8492"
  type: DetectionCategory;
  camera: string; // "Camera 01"
  cameraId: string; // "CAM-01"
  location: string; // "Main Gate" / "Restricted Zone"
  confidence: number; // e.g. 94
  risk: RiskLevel;
  timestamp: string;
  dateStr: string;
  status: IncidentStatus;
  description: string;
  recommendedAction?: string;
  snapshotPlaceholder?: string;
  investigatorNotes?: string;
  actionTaken?: string;
}

export interface DetectionEvent {
  id: string;
  category: DetectionCategory;
  camera: string;
  location: string;
  confidence: number;
  risk: RiskLevel;
  timestamp: string;
  bbox?: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
  };
}

export interface CampusZone {
  id: string;
  name: string;
  cameraIds: string[];
  riskLevel: RiskLevel;
  activeIncidentsCount: number;
  coordinates: { x: number; y: number; width: number; height: number };
  description: string;
  type: "entrance" | "academic" | "restricted" | "transit" | "utility";
}

export interface SystemStats {
  camerasOnline: number;
  totalCameras: number;
  activeAlerts: number;
  incidentsToday: number;
  currentRisk: RiskLevel;
}

export interface CopilotMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isFallback?: boolean;
  errorNotice?: string;
}
