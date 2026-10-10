import React, { useState } from "react";
import { SecurityProvider, useSecurity } from "./context/SecurityContext";
import { Header } from "./components/Header";
import { Sidebar, NavSection } from "./components/Sidebar";
import { AlertBanner } from "./components/AlertBanner";
import { IncidentDetailModal } from "./components/IncidentDetailModal";
import { OverviewView } from "./views/OverviewView";
import { LiveCamerasView } from "./views/LiveCamerasView";
import { DetectionView } from "./views/DetectionView";
import { IncidentsView } from "./views/IncidentsView";
import { CampusMapView } from "./views/CampusMapView";
import { AnalyticsView } from "./views/AnalyticsView";
import { CopilotView } from "./views/CopilotView";
import { SettingsView } from "./views/SettingsView";
import { Incident } from "./types";
import { MapPin, LayoutGrid } from "lucide-react";

const MainDashboard: React.FC = () => {
  const {
    activeAlertBanner,
    dismissAlertBanner,
    updateIncidentStatus,
    setSelectedCameraId,
  } = useSecurity();

  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [activeIncidentModal, setActiveIncidentModal] = useState<Incident | null>(null);
  const [copilotPrompt, setCopilotPrompt] = useState<string | undefined>(undefined);
  const [overviewTab, setOverviewTab] = useState<"grid" | "map">("grid");

  const handleSelectCamera = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    setActiveSection("cameras");
  };

  const handleOpenIncidentDetail = (incident: Incident) => {
    setActiveIncidentModal(incident);
  };

  const handleAskCopilot = (question: string) => {
    setCopilotPrompt(question);
    setActiveSection("copilot");
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top SOC Header */}
      <Header onOpenCopilot={() => setActiveSection("copilot")} />

      {/* Prominent High-Risk Alert Banner (Section 6 Requirement) */}
      <AlertBanner
        alert={activeAlertBanner}
        onDismiss={dismissAlertBanner}
        onViewIncident={(alert) => setActiveIncidentModal(alert)}
      />

      {/* Main Body Layout: Sidebar + Main Content View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Navigation (Section 2 Requirement) */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        {/* View Content Container */}
        <main className="flex-1 p-3 lg:p-5 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeSection === "overview" && (
            <div className="space-y-4">
              {/* Overview Sub-view Switcher: Camera Grid vs Campus Map */}
              <div className="flex items-center justify-between pb-2 border-b border-[#202433]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                    SURVEILLANCE MODE:
                  </span>
                  <div className="flex items-center bg-[#12151E] p-1 rounded-md border border-[#202433] text-xs font-mono">
                    <button
                      onClick={() => setOverviewTab("grid")}
                      className={`px-3 py-1 rounded flex items-center gap-1.5 transition font-medium ${
                        overviewTab === "grid"
                          ? "bg-emerald-600 text-white font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Camera Grid</span>
                    </button>

                    <button
                      onClick={() => setOverviewTab("map")}
                      className={`px-3 py-1 rounded flex items-center gap-1.5 transition font-medium ${
                        overviewTab === "map"
                          ? "bg-emerald-600 text-white font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Campus Risk Map</span>
                    </button>
                  </div>
                </div>
              </div>

              {overviewTab === "grid" ? (
                <OverviewView
                  onSelectCamera={handleSelectCamera}
                  onViewIncidents={() => setActiveSection("incidents")}
                  onOpenIncidentDetail={handleOpenIncidentDetail}
                />
              ) : (
                <CampusMapView onSelectCamera={handleSelectCamera} />
              )}
            </div>
          )}

          {activeSection === "cameras" && <LiveCamerasView />}

          {activeSection === "detection" && (
            <DetectionView onOpenIncidentDetail={handleOpenIncidentDetail} />
          )}

          {activeSection === "incidents" && (
            <IncidentsView onOpenIncidentDetail={handleOpenIncidentDetail} />
          )}

          {activeSection === "analytics" && <AnalyticsView />}

          {activeSection === "copilot" && (
            <CopilotView initialPrompt={copilotPrompt} />
          )}

          {activeSection === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Incident Detail Drawer/Modal */}
      <IncidentDetailModal
        incident={activeIncidentModal}
        onClose={() => setActiveIncidentModal(null)}
        onUpdateStatus={updateIncidentStatus}
        onAskCopilot={handleAskCopilot}
      />
    </div>
  );
};

export default function App() {
  return (
    <SecurityProvider>
      <MainDashboard />
    </SecurityProvider>
  );
}
