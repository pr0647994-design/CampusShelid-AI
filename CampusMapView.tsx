import React, { useState } from "react";
import { useSecurity } from "../context/SecurityContext";
import { CampusZone, RiskLevel } from "../types";
import {
  MapPin,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Radio,
  ExternalLink,
  Layers,
} from "lucide-react";

interface CampusMapViewProps {
  onSelectCamera: (cameraId: string) => void;
}

export const CampusMapView: React.FC<CampusMapViewProps> = ({
  onSelectCamera,
}) => {
  const { zones, cameras, incidents } = useSecurity();
  const [selectedZoneId, setSelectedZoneId] = useState<string>("restricted-zone");

  const selectedZone =
    zones.find((z) => z.id === selectedZoneId) || zones[0];

  const zoneIncidents = incidents.filter(
    (inc) =>
      inc.location.toLowerCase().includes(selectedZone.name.toLowerCase())
  );

  const getZoneColor = (risk: RiskLevel) => {
    switch (risk) {
      case "HIGH":
      case "CRITICAL":
        return {
          bg: "fill-red-900/40",
          stroke: "stroke-red-500",
          glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]",
          badge: "bg-red-950 text-red-400 border-red-800",
          text: "text-red-400",
        };
      case "MEDIUM":
        return {
          bg: "fill-amber-900/40",
          stroke: "stroke-amber-500",
          glow: "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
          badge: "bg-amber-950 text-amber-400 border-amber-800",
          text: "text-amber-400",
        };
      default:
        return {
          bg: "fill-emerald-950/30",
          stroke: "stroke-emerald-600/70",
          glow: "",
          badge: "bg-emerald-950 text-emerald-400 border-emerald-800",
          text: "text-emerald-400",
        };
    }
  };

  return (
    <div id="campus-risk-map-view" className="space-y-4">
      {/* Top Header */}
      <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
              Interactive Campus Threat & Risk Map
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Geospatial surveillance coverage across perimeter checkpoints and academic blocks.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Low Risk (Clear)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            <span>High Risk (Active)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Vector Blueprint Canvas (2 cols) */}
        <div className="lg:col-span-2 p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex flex-col justify-between">
          <div className="relative w-full aspect-[16/10] bg-[#0A0B0E] rounded border border-[#202433] overflow-hidden">
            {/* Blueprint Grid Lines */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>

            <svg
              viewBox="0 0 820 480"
              className="w-full h-full select-none"
            >
              {/* Outer Perimeter Wall Boundary */}
              <rect
                x="20"
                y="20"
                width="780"
                height="440"
                rx="4"
                fill="none"
                stroke="#262C3D"
                strokeWidth="2"
                strokeDasharray="6 4"
              />

              {/* Roadway Spine */}
              <path
                d="M 50 395 L 340 395 L 340 180 L 620 180 L 620 395 L 750 395"
                fill="none"
                stroke="#161922"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 50 395 L 340 395 L 340 180 L 620 180 L 620 395 L 750 395"
                fill="none"
                stroke="#333A4E"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />

              {/* Campus Zones */}
              {zones.map((zone) => {
                const color = getZoneColor(zone.riskLevel);
                const isSelected = selectedZoneId === zone.id;

                return (
                  <g
                    key={zone.id}
                    id={`map-zone-${zone.id}`}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className="cursor-pointer transition-all duration-300"
                  >
                    {/* Zone Rectangle */}
                    <rect
                      x={zone.coordinates.x}
                      y={zone.coordinates.y}
                      width={zone.coordinates.width}
                      height={zone.coordinates.height}
                      rx="4"
                      className={`${color.bg} ${color.stroke} ${color.glow} ${
                        isSelected ? "stroke-[2.5px]" : "stroke-[1.5px]"
                      } transition-all`}
                    />

                    {/* Zone Title */}
                    <text
                      x={zone.coordinates.x + 12}
                      y={zone.coordinates.y + 24}
                      fill="#f8fafc"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {zone.name}
                    </text>

                    {/* Risk indicator badge text */}
                    <text
                      x={zone.coordinates.x + 12}
                      y={zone.coordinates.y + 44}
                      fill={
                        zone.riskLevel === "HIGH"
                          ? "#f87171"
                          : zone.riskLevel === "MEDIUM"
                          ? "#fbbf24"
                          : "#34d399"
                      }
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      ● {zone.riskLevel} RISK
                    </text>

                    {/* Camera icon indicator if camera is placed in zone */}
                    {zone.cameraIds.length > 0 && (
                      <g
                        transform={`translate(${
                          zone.coordinates.x + zone.coordinates.width - 28
                        }, ${zone.coordinates.y + 10})`}
                      >
                        <circle cx="10" cy="10" r="10" fill="#12151E" />
                        <circle cx="10" cy="10" r="4" fill="#38bdf8" />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Bottom watermark */}
            <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-500 bg-[#0A0B0E]/90 px-2 py-0.5 rounded border border-[#202433]">
              CAMPUS GRID MAP • SECTOR BOUNDARY v2.1 • SIH26187
            </div>
          </div>
        </div>

        {/* Selected Zone Dossier Drawer (1 col) */}
        <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#202433] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#202433]">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  SELECTED SECTOR
                </span>
                <h3 className="text-sm font-bold text-white font-mono">
                  {selectedZone.name}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                  selectedZone.riskLevel === "HIGH"
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : selectedZone.riskLevel === "MEDIUM"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {selectedZone.riskLevel} RISK
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-mono">
              {selectedZone.description}
            </p>

            {/* Cameras assigned to this zone */}
            <div className="mt-3.5">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold block mb-2">
                Surveillance Camera Feeds:
              </span>
              {selectedZone.cameraIds.length === 0 ? (
                <div className="p-2.5 bg-[#181C28] border border-[#262C3D] rounded text-xs font-mono text-slate-500">
                  No dedicated camera assigned (covered by adjacent roaming PTZ).
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedZone.cameraIds.map((camId) => {
                    const cam = cameras.find((c) => c.id === camId);
                    if (!cam) return null;
                    return (
                      <div
                        key={cam.id}
                        className="p-2 bg-[#181C28] border border-[#262C3D] rounded flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-200 block">
                              {cam.name}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              ● {cam.status} • {cam.fps} FPS
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onSelectCamera(cam.id)}
                          className="px-2 py-1 bg-[#12151E] hover:bg-[#202636] text-slate-300 border border-[#262C3D] rounded text-xs font-mono transition"
                        >
                          View Feed
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Incidents at this Zone */}
            <div className="mt-3.5">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold block mb-2">
                Recent Sector Incidents ({zoneIncidents.length}):
              </span>
              {zoneIncidents.length === 0 ? (
                <div className="p-2.5 bg-[#181C28] border border-[#262C3D] rounded text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sector operating normally with zero active breaches.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {zoneIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2 bg-[#181C28] border border-[#262C3D] rounded text-xs font-mono flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white block">
                          {inc.type}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {inc.timestamp} • {inc.confidence}% Conf
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          inc.risk === "HIGH"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {inc.risk}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-[#202433]">
            Coordinates: X:{selectedZone.coordinates.x}, Y:{selectedZone.coordinates.y} • Sector ID: {selectedZone.id}
          </div>
        </div>
      </div>
    </div>
  );
};
