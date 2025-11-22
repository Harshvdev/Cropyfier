import { useState } from "react";
import CropPanel from "./panels/CropPanel";
import ResizePanel from "./panels/ResizePanel";
import TunePanel from "./panels/TunePanel";
import ExportPanel from "./panels/ExportPanel";

export default function Sidebar({ settings, setSettings, actions }) {
  const [activeTab, setActiveTab] = useState("crop");

  const tabs = [
    { 
      id: "crop", 
      label: "Crop", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg> 
    },
    { 
      id: "resize", 
      label: "Resize", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> 
    },
    { 
      id: "tune", 
      label: "Tune", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> 
    },
    { 
      id: "export", 
      label: "Save", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> 
    },
  ];

  return (
    // The Sidebar is now a Flex Column.
    // 1. Header (Fixed)
    // 2. Content (Flexible Scroll)
    // 3. Footer (Fixed)
    <div className="flex flex-col h-full w-full lg:w-[380px] lg:border-l border-gray-800 bg-gray-900">
      
      {/* 1. TAB HEADER (Fixed height) */}
      <div className="flex-none flex px-2 bg-gray-950/50 border-b border-gray-800 overflow-x-auto no-scrollbar z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            className={`flex-1 min-w-[80px] py-3 flex flex-col items-center justify-center gap-1 transition relative group outline-none ${
              activeTab === tab.id ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_-2px_10px_rgba(59,130,246,0.5)]"></div>}
          </button>
        ))}
      </div>

      {/* 2. CONTENT AREA (Flexible height, scrolls) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        {activeTab === "crop" && <CropPanel settings={settings} actions={actions} />}
        {activeTab === "resize" && <ResizePanel settings={settings} setSettings={setSettings} actions={actions} />}
        {activeTab === "tune" && <TunePanel settings={settings} setSettings={setSettings} actions={actions} />}
        {activeTab === "export" && <ExportPanel settings={settings} setSettings={setSettings} />}
        
        {/* Add a small spacer at the bottom so content isn't flush with the footer border */}
        <div className="h-4"></div>
      </div>

      {/* 3. FOOTER (Fixed height, always visible) */}
      <div className="flex-none p-4 bg-gray-900 border-t border-gray-800 z-20">
        <div className="flex gap-3 items-center">
            {/* Close Button: Fixed height (h-12), centered text */}
            <button 
              type="button" 
              onClick={actions.cancel} 
              className="flex-1 h-12 flex items-center justify-center text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-750 rounded-xl text-sm font-bold transition active:scale-[0.98]"
            >
                Close
            </button>

            {/* Save Button: Fixed height (h-12), centered text, matching alignment */}
            <button 
              type="button" 
              onClick={actions.download} 
              className="flex-[2] h-12 flex items-center justify-center bg-white text-black hover:bg-blue-50 rounded-xl font-bold shadow-lg shadow-white/5 gap-2 text-sm transition transform active:scale-[0.98]"
            >
                <span className="text-lg leading-none mb-0.5">⬇</span> Save Image
            </button>
        </div>
      </div>
    </div>
  );
}