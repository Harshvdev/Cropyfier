import { useState } from "react";
import CropPanel from "./panels/CropPanel";
import ResizePanel from "./panels/ResizePanel";
import TunePanel from "./panels/TunePanel";
import ExportPanel from "./panels/ExportPanel";

export default function Sidebar({ settings, setSettings, actions }) {
  const [activeTab, setActiveTab] = useState("crop");

  // Restored Original SVGs
  const tabs = [
    { 
      id: "crop", 
      label: "Crop", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> 
    },
    { 
      id: "resize", 
      label: "Resize", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> 
    },
    { 
      id: "tune", 
      label: "Tune", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> 
    },
    { 
      id: "export", 
      label: "Save", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> 
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-full lg:w-[380px] flex-shrink-0 z-20 shadow-2xl">
      
      {/* TAB HEADER */}
      <div className="flex px-2 pt-2 bg-gray-950/50 border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            className={`flex-1 py-4 flex flex-col items-center justify-center gap-1.5 transition relative group outline-none ${
              activeTab === tab.id ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <div className={`p-2 rounded-lg transition ${activeTab === tab.id ? "bg-blue-500/10" : "group-hover:bg-gray-800"}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_-2px_10px_rgba(59,130,246,0.5)]"></div>}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {activeTab === "crop" && <CropPanel settings={settings} actions={actions} />}
        {activeTab === "resize" && <ResizePanel settings={settings} setSettings={setSettings} actions={actions} />}
        {activeTab === "tune" && <TunePanel settings={settings} setSettings={setSettings} actions={actions} />}
        {activeTab === "export" && <ExportPanel settings={settings} setSettings={setSettings} />}
      </div>

      {/* FOOTER */}
      <div className="p-6 border-t border-gray-800 bg-gray-900/95 z-30 backdrop-blur">
        <button type="button" onClick={actions.download} className="w-full bg-white text-black hover:bg-blue-50 font-bold py-3.5 rounded-xl shadow-xl shadow-white/5 transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm tracking-wide">
          <span>⬇</span> Export Image
        </button>
        <button type="button" onClick={actions.cancel} className="w-full mt-3 py-2 text-gray-500 hover:text-red-400 text-xs font-medium transition">
          Close / Start Over
        </button>
      </div>
    </div>
  );
}