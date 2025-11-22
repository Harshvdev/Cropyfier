import { useState } from "react";

export default function Sidebar({ settings, setSettings, actions }) {
  const [activeTab, setActiveTab] = useState("crop");

  // Tab Configuration
  const tabs = [
    { id: "crop", label: "Crop & Rotate" },
    { id: "tune", label: "Adjustments" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-full lg:w-[380px] flex-shrink-0 z-20 shadow-2xl">
      
      {/* --- TAB NAVIGATION --- */}
      <div className="flex px-4 pt-4 border-b border-gray-800 space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === tab.id
                ? "text-white border-blue-500"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* ====== CROP TAB ====== */}
        {activeTab === "crop" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Tool Select */}
            <div className="bg-gray-800/50 p-1 rounded-xl flex gap-1 border border-gray-700/50">
              <button onClick={() => actions.setMode("move")} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${settings.dragMode === 'move' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <span>✋</span> Pan
              </button>
              <button onClick={() => actions.setMode("crop")} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${settings.dragMode === 'crop' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <span>⛶</span> Crop
              </button>
            </div>

            {/* Aspect Ratios */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Free", v: NaN },
                  { l: "1:1", v: 1 },
                  { l: "16:9", v: 16 / 9 },
                  { l: "4:5", v: 4 / 5 },
                  { l: "9:16", v: 9 / 16 },
                  { l: "Circle", v: "round" },
                ].map((p) => (
                  <button
                    key={p.l}
                    onClick={() =>
                      p.v === "round"
                        ? actions.toggleRound()
                        : actions.setPresetRatio(p.v)
                    }
                    className={`h-10 rounded-lg text-xs font-medium transition border flex items-center justify-center ${
                      (p.v === "round" && settings.isRound) || (!settings.isRound && settings.customWidth === '' && p.v === 1 && settings.scaleX === 999) /* Logic simplified for demo */
                        ? "bg-blue-500/10 border-blue-500 text-blue-400"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation & Flips */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Geometry</label>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => actions.rotate(-90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white transition hover:scale-105 active:scale-95">↺</button>
                <button onClick={() => actions.rotate(90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white transition hover:scale-105 active:scale-95">↻</button>
                <button onClick={actions.flipHorizontal} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white transition hover:scale-105 active:scale-95">⇄</button>
                <button onClick={actions.flipVertical} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white transition hover:scale-105 active:scale-95">⇅</button>
              </div>
            </div>
          </div>
        )}

        {/* ====== TUNE TAB ====== */}
        {activeTab === "tune" && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Image Correction</h3>
              <button onClick={actions.resetFilters} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase">Reset All</button>
            </div>

            {/* Custom Slider Component for reuse */}
            {[
              { label: 'Brightness', key: 'brightness', min: 0, max: 200 },
              { label: 'Contrast', key: 'contrast', min: 0, max: 200 },
              { label: 'Saturation', key: 'saturation', min: 0, max: 200 }
            ].map((item) => (
              <div key={item.key} className="group">
                <div className="flex justify-between text-xs text-gray-300 mb-3 font-medium">
                  <span>{item.label}</span>
                  <span className="font-mono text-blue-400">{settings[item.key]}%</span>
                </div>
                <div className="relative h-6 flex items-center">
                   <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    value={settings[item.key]}
                    onChange={(e) => setSettings({...settings, [item.key]: e.target.value})}
                    className="z-10 opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  {/* Visual Track */}
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400" 
                      style={{ width: `${(settings[item.key] / item.max) * 100}%` }}
                    ></div>
                  </div>
                  {/* Visual Thumb */}
                  <div 
                    className="absolute h-4 w-4 bg-white rounded-full shadow-lg border-2 border-blue-500 pointer-events-none transition-all duration-75"
                    style={{ left: `calc(${((settings[item.key] / item.max) * 100)}% - 8px)` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ====== EXPORT TAB ====== */}
        {activeTab === "export" && (
          <div className="space-y-6 animate-fade-in">
             
            {/* Dimensions Box */}
             <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-white">Output Size</h3>
                  <select 
                    value={settings.unit} 
                    onChange={(e) => actions.handleUnitChange(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-[10px] text-white px-2 py-1 rounded outline-none focus:border-blue-500"
                  >
                    <option value="px">PX</option>
                    <option value="cm">CM</option>
                    <option value="mm">MM</option>
                    <option value="in">IN</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                     <label className="absolute top-2 left-3 text-[10px] text-gray-500">W</label>
                     <input type="number" placeholder="Auto" value={settings.customWidth} onChange={(e) => actions.handleCustomSize(e.target.value, 'w')} className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-gray-800 transition text-white placeholder-gray-600" />
                  </div>
                  <div className="relative">
                     <label className="absolute top-2 left-3 text-[10px] text-gray-500">H</label>
                     <input type="number" placeholder="Auto" value={settings.customHeight} onChange={(e) => actions.handleCustomSize(e.target.value, 'h')} className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-gray-800 transition text-white placeholder-gray-600" />
                  </div>
                </div>
                
                {settings.unit !== 'px' && (
                   <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                      <label className="text-[10px] text-gray-400">DPI for Print</label>
                      <select value={settings.dpi} onChange={(e) => setSettings({...settings, dpi: parseInt(e.target.value)})} className="bg-transparent text-xs text-blue-400 font-bold outline-none cursor-pointer hover:text-blue-300">
                          <option value="72">Screen (72)</option>
                          <option value="300">Print (300)</option>
                      </select>
                   </div>
                )}
             </div>

             {/* Format Selector */}
             <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Format</label>
                <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  {['image/png', 'image/jpeg', 'image/webp'].map((f) => (
                    <button key={f} onClick={() => setSettings({...settings, format: f})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition ${settings.format === f ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                      {f.split('/')[1].toUpperCase()}
                    </button>
                  ))}
                </div>
             </div>

             {/* Quality Slider (if not PNG) */}
             {settings.format !== 'image/png' && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium"><span>Quality</span><span>{Math.round(settings.quality * 100)}%</span></div>
                  <input type="range" min="0.1" max="1" step="0.1" value={settings.quality} onChange={(e) => setSettings({...settings, quality: parseFloat(e.target.value)})} className="w-full" />
                </div>
             )}
          </div>
        )}
      </div>

      {/* --- BOTTOM ACTION AREA --- */}
      <div className="p-6 border-t border-gray-800 bg-gray-900/95 z-30 backdrop-blur">
        <button onClick={actions.download} className="w-full bg-white text-black hover:bg-blue-50 font-bold py-3.5 rounded-xl shadow-xl shadow-white/5 transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm tracking-wide">
          <span>⬇</span> Export Image
        </button>
        <button onClick={actions.cancel} className="w-full mt-3 py-2 text-gray-500 hover:text-red-400 text-xs font-medium transition">
          Close / Start Over
        </button>
      </div>
    </div>
  );
}