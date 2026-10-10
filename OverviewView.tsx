import React from "react";
import { useSecurity } from "../context/SecurityContext";
import { CameraFeedCanvas } from "../components/CameraFeedCanvas";
import { Incident } from "../types";
import {
  Video,
  Bell,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Users,
  Car,
  Radio,
  ArrowRight,
  Play,
  RotateCcw,
  Zap,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface OverviewViewProps {
  onSelectCamera: (cameraId: string) => void;
  onViewIncidents: () => void;
  onOpenIncidentDetail: (incident: Incident) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onSelectCamera,
  onViewIncidents,
  onOpenIncidentDetail,
}) => {
  const {
    cameras,
    stats,
    currentRisk,
    incidents,
    webcamStream,
    uploadedVideoUrl,
    simulateIntrusion,
    simulateLoitering,
    simulateSuspiciousActivity,
    simulateCrowdAnomaly,
    simulateMotionAnomaly,
    simulateNormalActivity,
    clearAlerts,
    runDemoScenario,
    isDemoRunning,
  } = useSecurity();

  const getRiskCardStyle = () => {
    switch (currentRisk) {
      case "HIGH":
      case "CRITICAL":
        return "border-red-500/40 bg-red-500/10 text-red-400";
      case "MEDIUM":
        return "border-amber-500/40 bg-amber-500/10 text-amber-400";
      default:
        return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    }
  };

  const recentIncidents = incidents.slice(0, 4);

  return (
    <div id="overview-view" className="space-y-4">
      {/* 4 Major Statistics Cards (Section 3 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Cameras Online */}
        <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block tracking-wider">
              CAMERAS ONLINE
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {stats.camerasOnline}
              </span>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                / {stats.totalCameras} Active
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              100% Operational Uptime
            </span>
          </div>
          <div className="w-10 h-10 rounded-md bg-[#181C28] border border-[#262C3D] text-emerald-400 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Alerts */}
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between transition ${
            stats.activeAlerts > 0
              ? "bg-red-500/10 border-red-500/40 text-red-300"
              : "bg-[#12151E] border-[#202433] text-slate-300"
          }`}
        >
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block tracking-wider">
              ACTIVE ALERTS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  stats.activeAlerts > 0 ? "text-red-400 animate-pulse" : "text-white"
                }`}
              >
                {stats.activeAlerts}
              </span>
              <span className="text-xs font-mono text-slate-400">Threat Flags</span>
            </div>
            <span className="text-[11px] font-mono mt-1 block text-slate-400">
              {stats.activeAlerts > 0
                ? "Immediate response required"
                : "No unacknowledged alerts"}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-md border flex items-center justify-center ${
              stats.activeAlerts > 0
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-[#181C28] border-[#262C3D] text-slate-400"
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Incidents Today */}
        <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block tracking-wider">
              INCIDENTS TODAY
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {stats.incidentsToday}
              </span>
              <span className="text-xs font-mono text-slate-400">Total Logged</span>
            </div>
            <span className="text-[11px] text-cyan-400 font-mono mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              YOLOv8 Real-Time Stream
            </span>
          </div>
          <div className="w-10 h-10 rounded-md bg-[#181C28] border border-[#262C3D] text-cyan-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Current Risk Level */}
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between transition ${getRiskCardStyle()}`}
        >
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block tracking-wider">
              CURRENT RISK LEVEL
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono tracking-wide">
                {currentRisk}
              </span>
            </div>
            <span className="text-[11px] font-mono mt-1 block">
              Campus Perimeter Threat Status
            </span>
          </div>
          <div className="w-10 h-10 rounded-md bg-[#181C28] border border-[#262C3D] flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* QUICK SIMULATION TOOLBAR (Section 6, 7, 12 Requirement) */}
      <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            INTELLIGENT EVENT SIMULATOR:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Simulate Intrusion Button */}
          <button
            id="sim-intrusion-btn"
            onClick={simulateIntrusion}
            className="px-2.5 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Intrusion</span>
          </button>

          {/* 2. Simulate Loitering */}
          <button
            id="sim-loitering-btn"
            onClick={simulateLoitering}
            className="px-2.5 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition"
          >
            <span>Loitering</span>
          </button>

          {/* 3. Simulate Crowd Anomaly */}
          <button
            id="sim-crowd-btn"
            onClick={simulateCrowdAnomaly}
            className="px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crowd</span>
          </button>

          {/* 4. Simulate Motion Anomaly */}
          <button
            id="sim-motion-btn"
            onClick={simulateMotionAnomaly}
            className="px-2.5 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition"
          >
            <span>Motion Spike</span>
          </button>

          {/* 4. Simulate Normal Activity */}
          <button
            id="sim-normal-btn"
            onClick={simulateNormalActivity}
            className="px-2.5 py-1.5 bg-[#181C28] hover:bg-[#202636] border border-[#262C3D] text-slate-300 rounded text-xs font-mono transition"
          >
            <span>Simulate Normal Activity</span>
          </button>

          {/* 5. Clear Alerts */}
          <button
            id="clear-alerts-btn"
            onClick={clearAlerts}
            className="px-2.5 py-1.5 bg-[#181C28] hover:bg-[#202636] border border-[#262C3D] text-slate-400 hover:text-slate-200 rounded text-xs font-mono flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Alerts</span>
          </button>
        </div>
      </div>

      {/* CAMERA MONITORING GRID (Section 3 Requirement) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
              Camera Monitoring Grid
            </h2>
            <span className="text-xs font-mono text-slate-400">
              (4 Prototype Feeds)
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Click camera to enter focused Live View
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              id={`camera-card-${camera.id}`}
              className={`p-3 rounded-lg bg-[#12151E] border transition flex flex-col justify-between ${
                camera.riskLevel === "HIGH"
                  ? "border-red-500/60 shadow-md shadow-red-950/30"
                  : camera.riskLevel === "MEDIUM"
                  ? "border-amber-500/50"
                  : "border-[#202433] hover:border-[#2C3347]"
              }`}
            >
              {/* Card Top Information */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">
                    {camera.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                      camera.riskLevel === "HIGH"
                        ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                        : camera.riskLevel === "MEDIUM"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    }`}
                  >
                    RISK: {camera.riskLevel}
                  </span>

                  <button
                    onClick={() => onSelectCamera(camera.id)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#181C28] transition"
                    title="Focus Camera Feed"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Video Preview Canvas */}
              <div className="h-52 w-full rounded overflow-hidden border border-[#202433] mb-2.5">
                <CameraFeedCanvas
                  camera={camera}
                  stream={camera.feedType === "webcam" ? webcamStream : null}
                  uploadedVideoUrl={uploadedVideoUrl}
                  showRestrictedZone={camera.id === "CAM-04"}
                  isIntrusionSimulated={camera.riskLevel === "HIGH"}
                  onSimulateIntrusion={
                    camera.id === "CAM-04" ? simulateIntrusion : undefined
                  }
                  isMini={true}
                />
              </div>

              {/* Card Bottom Stats: Location, ONLINE status, People count, Vehicle count, Detection status */}
              <div className="pt-2 border-t border-[#202433] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Location</span>
                  <span className="text-slate-300 font-semibold truncate block">
                    {camera.location}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Status</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {camera.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Objects</span>
                  <span className="text-slate-300 font-semibold flex items-center gap-2">
                    <span title="People count" className="flex items-center gap-0.5 tabular-nums">
                      <Users className="w-3 h-3 text-slate-400" /> {camera.peopleCount}
                    </span>
                    <span title="Vehicle count" className="flex items-center gap-0.5 tabular-nums">
                      <Car className="w-3 h-3 text-slate-400" /> {camera.vehicleCount}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Detection</span>
                  <span
                    className={`truncate block font-semibold ${
                      camera.riskLevel === "HIGH"
                        ? "text-red-400"
                        : "text-slate-300"
                    }`}
                  >
                    {camera.detectionStatus}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT INCIDENT LOGS STRIP */}
      <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Real-Time Security Event Stream
            </h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              ({incidents.length} today)
            </span>
          </div>
          <button
            onClick={onViewIncidents}
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#202433]">
          {recentIncidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => onOpenIncidentDetail(incident)}
              className="py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#181C28] px-2 rounded cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    incident.risk === "HIGH"
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : incident.risk === "MEDIUM"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {incident.risk}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {incident.type}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      [{incident.id}]
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                    <span>{incident.camera}</span>
                    <span>•</span>
                    <span>{incident.location}</span>
                    <span>•</span>
                    <span className="text-cyan-400 tabular-nums">{incident.confidence}% Conf</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400 tabular-nums">{incident.timestamp}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    incident.status === "ACTIVE"
                      ? "bg-red-950/70 border border-red-800/40 text-red-400"
                      : incident.status === "INVESTIGATING"
                      ? "bg-amber-950/70 border border-amber-800/40 text-amber-300"
                      : "bg-emerald-950/70 border border-emerald-800/40 text-emerald-400"
                  }`}
                >
                  {incident.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
