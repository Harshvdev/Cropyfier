// src/components/Sidebar.jsx
import { useState } from "react";
import CropPanel from "./panels/CropPanel";
import ResizePanel from "./panels/ResizePanel";
import TunePanel from "./panels/TunePanel";
import WatermarkPanel from "./panels/WatermarkPanel";
import ExportPanel from "./panels/ExportPanel";

export default function Sidebar({ settings, setSettings, actions, activeTab, setActiveTab }) {
  
  // Mobile panel state
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const tabs = [
    { id: "crop", label: "Crop", icon: "M12 4v16m8-8H4" },
    { id: "tune", label: "Tune", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
    { id: "watermark", label: "Text", icon: "M4 6h16M4 12h16m-7 6h7" },
    { id: "resize", label: "Size", icon: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" },
    { id: "export", label: "Save", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
  ];

  const renderPanel = () => {
    switch(activeTab) {
      case "crop": return <CropPanel settings={settings} actions={actions} />;
      case "resize": return <ResizePanel settings={settings} setSettings={setSettings} actions={actions} />;
      case "tune": return <TunePanel settings={settings} setSettings={setSettings} actions={actions} />;
      case "watermark": return <WatermarkPanel settings={settings} setSettings={setSettings} />;
      case "export": return <ExportPanel settings={settings} setSettings={setSettings} actions={actions} />;
      default: return null;
    }
  };

  return (
    <>
      {/* --- DESKTOP VIEW (Right Side) --- */}
      <div className="hidden lg:flex flex-col h-full w-[360px] bg-[#0B0F19]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl z-30">
        <div className="flex border-b border-white/5 bg-black/20 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition rounded-lg ${
                activeTab === tab.id ? "bg-white/5 text-blue-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === tab.id ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {renderPanel()}
        </div>
      </div>

      {/* --- MOBILE VIEW (Bottom Sheet) --- */}
      <div className="lg:hidden flex flex-col bg-[#0B0F19] border-t border-white/10 w-full z-30 relative shadow-[0_-5px_20px_rgba(0,0,0,0.5)] flex-shrink-0">
        
        {/* Control Panel (Scrollable) */}
        {/* Reduced max-h to 35vh to GUARANTEE tabs are visible even on small screens */}
        <div className="bg-[#0B0F19] w-full max-h-[35vh] overflow-y-auto custom-scrollbar p-5 border-b border-white/5">
             {renderPanel()}
        </div>

        {/* Bottom Tabs */}
        {/* flex-none ensures this container never shrinks */}
        <div className="flex-none flex items-center justify-between px-2 py-3 bg-[#020617] backdrop-blur-lg safe-area-bottom border-t border-white/5">
          {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => { setActiveTab(tab.id); setIsPanelOpen(true); }}
               className={`flex-1 p-2 flex flex-col items-center gap-1 rounded-lg active:scale-95 transition ${
                 activeTab === tab.id ? "text-blue-400" : "text-gray-500"
               }`}
             >
                <div className={`p-2 rounded-full ${activeTab === tab.id ? "bg-blue-500/20" : ""}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-bold uppercase mt-0.5">{tab.label}</span>
             </button>
          ))}
        </div>
      </div>
    </>
  );
}