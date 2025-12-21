// src/components/Sidebar.jsx
import { useState } from "react";
import CropPanel from "./panels/CropPanel";
import ResizePanel from "./panels/ResizePanel";
import TunePanel from "./panels/TunePanel";
import WatermarkPanel from "./panels/WatermarkPanel";
import ExportPanel from "./panels/ExportPanel";

export default function Sidebar({ settings, setSettings, actions, activeTab, setActiveTab }) {
  
  // Mobile: Toggle panel visibility (optional, but good for pure viewing)
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
      case "export": return <ExportPanel settings={settings} setSettings={setSettings} />;
      default: return null;
    }
  };

  return (
    <>
      {/* --- DESKTOP VIEW (Large Screens) --- */}
      <div className="hidden lg:flex flex-col h-full w-[360px] bg-[#0B0F19]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl">
        {/* Tab Navigation (Desktop) */}
        <div className="flex border-b border-white/5 bg-black/20 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition rounded-lg ${
                activeTab === tab.id ? "bg-white/5 text-blue-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === tab.id ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel Content (Desktop) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 relative">
          {renderPanel()}
        </div>

        {/* Desktop Footer Actions */}
        <div className="p-5 border-t border-white/5 bg-black/20">
           <div className="flex gap-2">
              <button 
                onClick={actions.download}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                 <span>Export Image</span>
              </button>
              <button onClick={actions.copyToClipboard} className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/5 transition" title="Copy">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              </button>
           </div>
        </div>
      </div>


      {/* --- MOBILE VIEW (Small Screens) --- */}
      <div className="lg:hidden flex flex-col bg-[#0B0F19] border-t border-white/10">
        
        {/* 1. Control Panel (Slides up above tabs) */}
        {/* We use a max-height to ensure the image is still visible above */}
        <div className="bg-[#0B0F19] w-full max-h-[40vh] overflow-y-auto custom-scrollbar p-4 border-b border-white/5">
             {renderPanel()}
        </div>

        {/* 2. Bottom Navigation Tabs */}
        <div className="flex items-center justify-between px-2 py-2 bg-black/40 backdrop-blur-lg">
          {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => { setActiveTab(tab.id); setIsPanelOpen(true); }}
               className={`flex-1 p-2 flex flex-col items-center gap-1 rounded-lg active:scale-95 transition ${
                 activeTab === tab.id ? "text-blue-400" : "text-gray-500"
               }`}
             >
                <div className={`p-1.5 rounded-full ${activeTab === tab.id ? "bg-blue-500/20" : ""}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                </div>
                <span className="text-[9px] font-bold uppercase">{tab.label}</span>
             </button>
          ))}
        </div>
      </div>
    </>
  );
}