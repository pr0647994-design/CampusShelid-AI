import React, { useRef, useState } from "react";
import { useSecurity } from "../context/SecurityContext";
import { CameraFeedCanvas } from "../components/CameraFeedCanvas";
import {
  Camera,
  Upload,
  Radio,
  ShieldAlert,
  AlertTriangle,
  Info,
  RefreshCw,
  Activity,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  FlaskConical,
  X,
  Volume2,
  Cpu,
  Layers,
  Timer,
} from "lucide-react";

export const LiveCamerasView: React.FC = () => {
  const {
    cameras,
    selectedCameraId,
    selectedCamera,
    setSelectedCameraId,
    isWebcamActive,
    webcamStream,
    webcamError,
    startWebcam,
    stopWebcam,
    handleFileUpload,
    simulateIntrusion,
    simulateLoitering,
    simulateCrowdAnomaly,
    simulateMotionAnomaly,
    simulateNormalActivity,
    clearAlerts,
    activeAISecurityAlert,
    analysisLogs,
    dismissAISecurityAlert,
    soundEnabled,
    setSoundEnabled,
    yoloFps,
    trackedObjects,
    detectionSource,
    yoloResult,
    geminiStatus,
    requestGeminiVerification,
    geminiExplanation,
    isGeminiVerifying,
    aiServiceError,
    rateLimitCooldownSeconds,
  } = useSecurity();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(true);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const isRestrictedActive =
    selectedCamera.id === "CAM-04" ||
    selectedCamera.isRestrictedZone ||
    selectedCamera.feedType === "webcam";

  const isThreatDetected =
    activeAISecurityAlert !== null ||
    (yoloResult && yoloResult.isThreat);

  const personCount = trackedObjects.filter((o) => o.label === "person").length;
  const trackIds = trackedObjects.map((o) => `#${o.id}`);

  return (
    <div id="live-cameras-view" className="space-y-4">
      {/* Channel Selector & Primary Device Controls */}
      <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex flex-wrap items-center justify-between gap-3">
        {/* Camera Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono uppercase text-slate-400 font-semibold mr-1">
            SELECT CHANNEL:
          </span>
          {cameras.map((cam) => (
            <button
              key={cam.id}
              id={`select-camera-btn-${cam.id}`}
              onClick={() => setSelectedCameraId(cam.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition ${
                selectedCameraId === cam.id
                  ? "bg-emerald-600 text-white border border-emerald-500 font-bold shadow-sm"
                  : "bg-[#181C28] text-slate-300 hover:bg-[#202636] border border-[#262C3D]"
              }`}
            >
              <Radio
                className={`w-3 h-3 ${
                  selectedCameraId === cam.id
                    ? "text-white"
                    : cam.riskLevel === "HIGH"
                    ? "text-red-400 animate-pulse"
                    : "text-emerald-400"
                }`}
              />
              <span>{cam.shortName}</span>
              {cam.riskLevel === "HIGH" && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping"></span>
              )}
            </button>
          ))}
        </div>

        {/* Live Webcam & Upload Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-2.5 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 border transition ${
              soundEnabled
                ? "bg-[#181C28] text-emerald-300 border-emerald-600/40"
                : "bg-[#181C28] text-slate-400 border-[#262C3D]"
            }`}
            title={soundEnabled ? "Buzzer Alert Sound ON" : "Buzzer Alert Sound MUTED"}
          >
            <Volume2 className={`w-3.5 h-3.5 ${soundEnabled ? "text-emerald-400" : "text-slate-500"}`} />
            <span className="hidden sm:inline">{soundEnabled ? "BUZZER ON" : "MUTED"}</span>
          </button>

          {/* Webcam Start/Stop Button */}
          {isWebcamActive ? (
            <button
              id="stop-webcam-btn"
              onClick={stopWebcam}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded text-xs font-mono font-bold flex items-center gap-2 transition shadow-md shadow-red-950/50"
            >
              <Camera className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              id="start-webcam-btn"
              onClick={startWebcam}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded text-xs font-mono font-bold flex items-center gap-2 transition shadow-md shadow-emerald-950/50"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          )}

          {/* Upload Video Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onFileInputChange}
            className="hidden"
          />
          <button
            id="upload-video-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-[#181C28] hover:bg-[#202636] text-slate-300 border border-[#262C3D] rounded text-xs font-mono font-medium flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">UPLOAD VIDEO</span>
          </button>
        </div>
      </div>

      {/* 1. REAL-TIME LOCAL COMPUTER VISION PIPELINE PANEL (YOLO + ByteTrack) */}
      <div
        id="live-ai-status-panel"
        className={`p-4 rounded-lg border font-mono transition-all duration-300 shadow-md ${
          isThreatDetected
            ? "bg-[#1F0C10] border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.25)] ring-1 ring-red-500/40"
            : isWebcamActive
            ? "bg-[#0E1522] border-cyan-500/40 shadow-cyan-950/30"
            : "bg-[#12151E] border-[#202433]"
        }`}
      >
        {/* Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Cpu className={`w-5 h-5 ${isThreatDetected ? "text-red-400" : isWebcamActive ? "text-cyan-400" : "text-slate-400"}`} />
              <span className="text-sm font-bold text-white tracking-wider">
                EDGE COMPUTER VISION PIPELINE
              </span>
            </div>

            {/* Active Status Badge */}
            {isWebcamActive ? (
              <span className="px-2.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                ● LIVE YOLO INFERENCE ({yoloFps.toFixed(1)} FPS)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                ● STANDBY
              </span>
            )}

            {/* Tracker Badge */}
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              ByteTrack Multi-Object Tracker
            </span>

            {/* Detection Source Tag */}
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold border ${
                detectionSource === "REAL YOLO"
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                  : "bg-amber-950 text-amber-300 border-amber-500/50"
              }`}
            >
              {detectionSource}
            </span>
          </div>

          {/* Secondary AI Layer Status & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Optional Deep Gemini Verification Trigger */}
            <button
              id="verify-with-gemini-btn"
              onClick={() => requestGeminiVerification()}
              disabled={isGeminiVerifying}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
              title="Request Gemini AI natural-language SOP explanation for active detection"
            >
              {isGeminiVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Consulting Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gemini AI Verification</span>
                </>
              )}
            </button>

            {/* Gemini Secondary Layer Status */}
            {geminiStatus === "QUOTA_COOLDOWN" ? (
              <span className="px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/60 font-mono text-[11px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Gemini AI: OFFLINE / QUOTA EXHAUSTED ({rateLimitCooldownSeconds}s)
              </span>
            ) : geminiStatus === "READY" ? (
              <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-500/40 font-mono text-[11px] flex items-center gap-1">
                <Brain className="w-3 h-3 text-blue-400" />
                Gemini AI: STANDBY (Secondary)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono text-[11px]">
                Gemini AI: OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* Panel Body: Real-Time Telemetry Data */}
        <div className="pt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Current Activity */}
          <div className="p-2.5 rounded bg-black/40 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block mb-1">
              Current Activity
            </span>
            <span
              className={`text-sm font-bold tracking-wide flex items-center gap-1.5 ${
                yoloResult?.activity === "RESTRICTED_ZONE_INTRUSION"
                  ? "text-red-400 animate-pulse"
                  : yoloResult?.activity === "SUSPICIOUS_LOITERING" ||
                    yoloResult?.activity === "CROWD_ANOMALY" ||
                    yoloResult?.activity === "MOTION_ANOMALY"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {yoloResult?.activity === "RESTRICTED_ZONE_INTRUSION" && (
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              )}
              {(!yoloResult || yoloResult.activity === "NORMAL") && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{yoloResult?.activityLabel || "PERIMETER SECURE"}</span>
            </span>
          </div>

          {/* Detections & Tracks */}
          <div className="p-2.5 rounded bg-black/40 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block mb-1">
              Tracked Entities
            </span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold text-sm">
                {trackedObjects.length} Objects
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-300 font-bold text-sm">
                {personCount} Persons
              </span>
            </div>
          </div>

          {/* Active Track IDs */}
          <div className="p-2.5 rounded bg-black/40 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block mb-1">
              ByteTrack IDs
            </span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {trackIds.length > 0 ? trackIds.join(", ") : "No active tracks"}
            </span>
          </div>

          {/* Confidence & Risk */}
          <div className="p-2.5 rounded bg-black/40 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block mb-1">
              Confidence & Risk
            </span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold text-sm tabular-nums">
                {yoloResult?.confidence || 95}%
              </span>
              <span className="text-slate-600">•</span>
              <span
                className={`font-bold text-xs px-2 py-0.5 rounded border ${
                  yoloResult?.riskLevel === "HIGH"
                    ? "bg-red-950/80 text-red-300 border-red-600/70"
                    : yoloResult?.riskLevel === "MEDIUM"
                    ? "bg-amber-950/80 text-amber-300 border-amber-600/70"
                    : "bg-emerald-950/80 text-emerald-300 border-emerald-600/70"
                }`}
              >
                {yoloResult?.riskLevel || "LOW"} RISK
              </span>
            </div>
          </div>

          {/* Processing Engine */}
          <div className="p-2.5 rounded bg-black/40 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block mb-1">
              Pipeline Architecture
            </span>
            <span className="text-slate-300 text-xs block font-bold">
              YOLOv8 + ByteTrack + OpenCV
            </span>
            <span className="text-[10px] text-emerald-400">
              Zero-Quota Dependency
            </span>
          </div>
        </div>

        {/* DEVELOPER DEBUG STATUS (Requirement 9: Person Count, Active Tracks, Triggered Rule, Confirmation Frames, Alert State) */}
        {(() => {
          const debug = yoloResult?.debugInfo || {
            personCount,
            activePersonTracks: trackIds.length > 0 ? trackIds.join(", ") : "0",
            triggeredRule: "NONE",
            confirmationFrames: "0/8",
            confirmationCount: 0,
            confirmationRequired: 8,
            alertState: "NORMAL" as const,
          };

          return (
            <div
              id="cv-pipeline-debug-status"
              className="mt-3 p-2.5 rounded bg-[#090C15] border border-cyan-900/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 font-bold text-[10px] uppercase tracking-wider">
                  PIPELINE STATUS & DEBOUNCE
                </span>
                <span className="text-[11px] text-slate-400 hidden lg:inline">
                  Strict Person-Prerequisite Enforcement
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-slate-300">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">Person Count:</span>
                  <span className={`font-bold ${debug.personCount > 0 ? "text-purple-300" : "text-slate-300"}`}>
                    {debug.personCount}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">Active Tracks:</span>
                  <span className={`font-bold ${debug.activePersonTracks !== "0" ? "text-cyan-300" : "text-slate-500"}`}>
                    {debug.activePersonTracks}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">Triggered Rule:</span>
                  <span
                    className={`font-bold ${
                      debug.triggeredRule !== "NONE"
                        ? "text-red-400 animate-pulse"
                        : "text-emerald-400"
                    }`}
                  >
                    {debug.triggeredRule}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">Confirmation:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      debug.confirmationCount >= 8
                        ? "text-red-400 font-black"
                        : debug.confirmationCount > 0
                        ? "text-amber-400"
                        : "text-slate-500"
                    }`}
                  >
                    {debug.confirmationFrames}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">Alert State:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                      debug.alertState === "ALERT"
                        ? "bg-red-600 text-white animate-pulse"
                        : debug.alertState === "EVALUATING"
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                    }`}
                  >
                    {debug.alertState}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Gemini Explanation Box (If requested) */}
        {geminiExplanation && (
          <div className="mt-3 p-3 rounded bg-blue-950/40 border border-blue-500/40 text-xs text-blue-200">
            <div className="flex items-center justify-between gap-2 pb-1 mb-1.5 border-b border-blue-900/60 font-bold">
              <span className="flex items-center gap-1.5 text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Gemini AI Secondary Verification & Tactical Assessment
              </span>
              <button
                onClick={() => requestGeminiVerification()}
                className="text-[10px] text-cyan-300 hover:underline"
              >
                Refresh Analysis
              </button>
            </div>
            <p className="leading-relaxed text-slate-200">{geminiExplanation}</p>
          </div>
        )}
      </div>

      {/* 2. PROMINENT AI SECURITY ALERT BANNER (When Threat Detected) */}
      {activeAISecurityAlert && (
        <div
          id="ai-security-alert-card"
          className="p-4 rounded-lg bg-[#200B0F] border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] ring-2 ring-red-500/50 font-mono text-xs animate-in fade-in duration-200"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2.5 border-b border-red-800/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-red-600 text-white animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-black text-red-300 tracking-wide flex items-center gap-2">
                  <span>🚨 AI SECURITY ALERT</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 border border-red-500 text-red-200 font-bold">
                    {activeAISecurityAlert.riskLevel} RISK
                  </span>
                </div>
                <div className="text-[11px] text-red-400 mt-0.5">
                  Automated threat notification broadcasted across SOC dashboard
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                  activeAISecurityAlert.source === "REAL YOLO"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/60"
                    : "bg-purple-950 text-purple-300 border-purple-500/60"
                }`}
              >
                {activeAISecurityAlert.source}
              </span>
              <button
                onClick={dismissAISecurityAlert}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                title="Acknowledge Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Activity Detected</span>
              <strong className="text-amber-300 text-xs sm:text-sm font-bold">
                {activeAISecurityAlert.activityLabel}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Confidence</span>
              <strong className="text-cyan-300 text-xs sm:text-sm font-bold tabular-nums">
                {activeAISecurityAlert.confidence}%
              </strong>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Timestamp</span>
              <strong className="text-slate-200 text-xs sm:text-sm font-bold tabular-nums">
                {activeAISecurityAlert.timestamp}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Channel / Zone</span>
              <strong className="text-white text-xs sm:text-sm font-bold">
                {activeAISecurityAlert.cameraName} [{activeAISecurityAlert.location}]
              </strong>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded bg-black/60 border border-red-900/60 text-slate-300">
            <span className="text-red-400 font-bold block mb-1">Observation:</span>
            <span>{activeAISecurityAlert.description}</span>
            {activeAISecurityAlert.recommendedAction && (
              <div className="mt-1.5 pt-1.5 border-t border-red-900/40 text-amber-300 text-[11px]">
                <strong className="text-slate-400">Recommended SOP: </strong>
                {activeAISecurityAlert.recommendedAction}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webcam Error Banner */}
      {webcamError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{webcamError}</span>
        </div>
      )}

      {/* Distinction & Provenance Label Strip */}
      <div className="p-2.5 bg-[#12151E] border border-[#202433] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            ACTIVE STREAM ARCHITECTURE:{" "}
            <strong className="text-white">
              {selectedCamera.feedType === "webcam" ? (
                <span className="text-cyan-300">
                  LIVE WEBCAM + IN-BROWSER YOLOv8 & BYTETRACK (Real-Time 30 FPS)
                </span>
              ) : selectedCamera.feedType === "uploaded" ? (
                <span className="text-indigo-300">CUSTOM RECORDED VIDEO STREAM</span>
              ) : (
                <span className="text-slate-300">
                  SIMULATED CCTV STREAM WITH SYNTHETIC TRACKING
                </span>
              )}
            </strong>
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          SIH26187 Protocol: Zero-Cloud Client-Side CV Runtime
        </div>
      </div>

      {/* Main Focus Camera Feed Display */}
      <div className="relative w-full h-[520px] rounded-lg overflow-hidden border border-[#202433] bg-black">
        <CameraFeedCanvas
          camera={selectedCamera}
          stream={selectedCamera.feedType === "webcam" ? webcamStream : null}
          showRestrictedZone={isRestrictedActive}
          isIntrusionSimulated={selectedCamera.riskLevel === "HIGH" || isThreatDetected}
          onSimulateIntrusion={simulateIntrusion}
        />
      </div>

      {/* 3. COLLAPSIBLE AI ANALYSIS LOG */}
      <div
        id="ai-analysis-log-panel"
        className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] font-mono text-xs"
      >
        <div
          onClick={() => setIsLogOpen(!isLogOpen)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider text-xs sm:text-sm">
              EDGE INFERENCE & EVENT AUDIT LOG
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
              {analysisLogs.length} / 10 RECENT FRAMES
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px] hidden sm:inline">
              {isLogOpen ? "Click to collapse" : "Click to view live frame log"}
            </span>
            {isLogOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isLogOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] text-slate-400 mb-2">
              Continuous chronological record of local YOLO detections and ByteTrack tracking events. Operates locally with zero external API dependencies.
            </p>

            {analysisLogs.length === 0 ? (
              <div className="p-4 rounded bg-[#0D1017] border border-slate-800/60 text-center text-slate-400">
                {isWebcamActive ? (
                  <span className="flex items-center justify-center gap-2 text-cyan-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Waiting for first YOLO detection result...
                  </span>
                ) : (
                  <span>
                    No frame evaluations recorded yet. Start camera or run a simulation to see incoming frame entries.
                  </span>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800 bg-[#0A0D14]">
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Activity</th>
                      <th className="py-2 px-3">Confidence</th>
                      <th className="py-2 px-3">Risk</th>
                      <th className="py-2 px-3 hidden md:table-cell">Observation</th>
                      <th className="py-2 px-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {analysisLogs.map((log) => {
                      const isHigh = log.riskLevel === "HIGH";
                      const isMed = log.riskLevel === "MEDIUM";
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-800/30 transition-colors ${
                            isHigh
                              ? "bg-red-950/20 text-red-200"
                              : isMed
                              ? "bg-amber-950/15 text-amber-200"
                              : "text-slate-300"
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-300 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-2 px-3 font-bold whitespace-nowrap">
                            <span
                              className={
                                isHigh
                                  ? "text-red-400"
                                  : isMed
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }
                            >
                              {log.activity.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-cyan-300 tabular-nums whitespace-nowrap">
                            {log.confidence}%
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isHigh
                                  ? "bg-red-900/60 text-red-200 border border-red-700"
                                  : isMed
                                  ? "bg-amber-900/60 text-amber-200 border border-amber-700"
                                  : "bg-emerald-900/60 text-emerald-200 border border-emerald-700"
                              }`}
                            >
                              {log.riskLevel}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-300 hidden md:table-cell max-w-md truncate">
                            {log.description}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                log.source === "REAL YOLO"
                                  ? "bg-emerald-950/90 text-emerald-300 border border-emerald-600/50"
                                  : "bg-purple-950/90 text-purple-300 border border-purple-600/50"
                              }`}
                            >
                              {log.source || "REAL YOLO"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. TEST MODE & SIMULATION CONTROLS (Clearly Labeled DEMO SIMULATION) */}
      <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
              DEMO SIMULATION CONTROLS (TEST SCENARIOS)
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
              UNIFIED INCIDENT PIPELINE
            </span>
          </div>
          <p className="text-slate-400 mt-1 max-w-2xl text-[11px]">
            Trigger simulated security events to verify SOC alarms, auto-dossiers, and buzzer behaviors without needing physical props. Uses the identical incident, tracking, and risk pipeline as <strong>REAL YOLO</strong> live camera detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="demo-simulate-intrusion-btn"
            onClick={() => simulateIntrusion()}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-500 shadow-sm transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>DEMO: INTRUSION</span>
          </button>

          <button
            id="demo-simulate-loitering-btn"
            onClick={() => simulateLoitering()}
            className="px-3 py-1.5 bg-[#181C28] hover:bg-[#202636] text-amber-300 border border-amber-500/40 rounded font-semibold flex items-center gap-1.5 transition"
          >
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>DEMO: LOITERING</span>
          </button>

          <button
            id="demo-simulate-crowd-btn"
            onClick={() => simulateCrowdAnomaly()}
            className="px-3 py-1.5 bg-[#181C28] hover:bg-[#202636] text-cyan-300 border border-cyan-500/40 rounded font-semibold flex items-center gap-1.5 transition"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>DEMO: CROWD</span>
          </button>

          <button
            id="demo-simulate-motion-btn"
            onClick={() => simulateMotionAnomaly()}
            className="px-3 py-1.5 bg-[#181C28] hover:bg-[#202636] text-purple-300 border border-purple-500/40 rounded font-semibold flex items-center gap-1.5 transition"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>DEMO: MOTION ANOMALY</span>
          </button>

          <button
            id="demo-simulate-normal-btn"
            onClick={() => simulateNormalActivity()}
            className="px-3 py-1.5 bg-[#181C28] hover:bg-[#202636] text-emerald-300 border border-emerald-500/40 rounded font-semibold flex items-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>DEMO: NORMAL</span>
          </button>

          <button
            id="clear-all-alerts-btn"
            onClick={() => clearAlerts()}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Selected Camera Telemetry Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="p-3 bg-[#12151E] border border-[#202433] rounded-lg">
          <span className="text-slate-500 block mb-1 uppercase text-[10px]">Camera Identification</span>
          <span className="text-white font-bold">{selectedCamera.name}</span>
        </div>
        <div className="p-3 bg-[#12151E] border border-[#202433] rounded-lg">
          <span className="text-slate-500 block mb-1 uppercase text-[10px]">Assigned Zone</span>
          <span className="text-emerald-400 font-bold">{selectedCamera.location}</span>
        </div>
        <div className="p-3 bg-[#12151E] border border-[#202433] rounded-lg">
          <span className="text-slate-500 block mb-1 uppercase text-[10px]">Tracked Entities</span>
          <span className="text-cyan-400 font-bold tabular-nums">
            {selectedCamera.peopleCount} Pedestrians • {selectedCamera.vehicleCount} Vehicles
          </span>
        </div>
        <div className="p-3 bg-[#12151E] border border-[#202433] rounded-lg">
          <span className="text-slate-500 block mb-1 uppercase text-[10px]">Detection Inference</span>
          <span className="text-slate-200 font-bold line-clamp-1">
            {selectedCamera.detectionStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
