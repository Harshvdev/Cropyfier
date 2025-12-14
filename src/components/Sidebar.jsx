// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import CropPanel from "./panels/CropPanel";
import ResizePanel from "./panels/ResizePanel";
import TunePanel from "./panels/TunePanel";
import WatermarkPanel from "./panels/WatermarkPanel";
import ExportPanel from "./panels/ExportPanel";

export default function Sidebar({ settings, setSettings, actions, activeTab, setActiveTab }) {
  
  const tabs = [
    { 
      id: "crop", 
      label: "Crop", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> 
    },
    { 
      id: "tune", 
      label: "Tune", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> 
    },
    { 
      id: "watermark", 
      label: "Text", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg> 
    },
    { 
      id: "resize", 
      label: "Size", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> 
    },
    { 
      id: "export", 
      label: "Save", 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> 
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-full lg:w-[380px] flex-shrink-0 z-20 shadow-2xl">
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {activeTab === "crop" && <CropPanel settings={settings} actions={actions} />}
        {activeTab === "resize" && <ResizePanel settings={settings} setSettings={setSettings} actions={actions} />}
        {activeTab === "tune" && <TunePanel settings={settings} setSettings={setSettings} actions={actions} />}
        {activeTab === "watermark" && <WatermarkPanel settings={settings} setSettings={setSettings} />}
        {activeTab === "export" && <ExportPanel settings={settings} setSettings={setSettings} />}
      </div>

      <div className="p-6 border-t border-gray-800 bg-gray-900/95 z-30 backdrop-blur">
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={actions.download} className="flex-1 bg-white text-black hover:bg-blue-50 font-bold py-3.5 rounded-xl shadow-xl shadow-white/5 transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm tracking-wide">
            <span>⬇</span> Export
          </button>
          <button type="button" onClick={actions.copyToClipboard} className="w-16 bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 font-bold rounded-xl flex items-center justify-center transition active:scale-95" title="Copy to Clipboard">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
        <button type="button" onClick={actions.cancel} className="w-full py-2 text-gray-500 hover:text-red-400 text-xs font-medium transition">
          Close / Start Over
        </button>
      </div>
    </div>
  );
}