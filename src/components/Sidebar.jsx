import { useState } from 'react'

export default function Sidebar({ settings, setSettings, actions }) {
  const [activeTab, setActiveTab] = useState('crop')

  // Helpers
  const handleSizeInput = (e, type) => actions.handleCustomSize(e.target.value, type)

  const tabs = [
    { id: 'crop', icon: '⛶', label: 'Crop' },
    { id: 'tune', icon: '⚡', label: 'Tune' },
    { id: 'export', icon: '⬇', label: 'Export' },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
      
      {/* TAB HEADER */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-5 text-sm font-bold flex items-center justify-center gap-2 transition ${
              activeTab === tab.id 
                ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-gray-900">
        
        {/* --- CROP TAB --- */}
        {activeTab === 'crop' && (
          <div className="space-y-8">
            
            {/* Tool Toggle */}
            <div>
               <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Tools</label>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => actions.setMode('move')} className={`py-3 rounded-xl text-sm font-semibold transition border ${settings.dragMode === 'move' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                    ✋ Pan
                  </button>
                  <button onClick={() => actions.setMode('crop')} className={`py-3 rounded-xl text-sm font-semibold transition border ${settings.dragMode === 'crop' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                    ⛶ Crop
                  </button>
               </div>
            </div>

            {/* Presets */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Free', v: NaN }, { l: 'Square', v: 1 }, { l: '16:9', v: 16/9 },
                  { l: '4:5', v: 4/5 }, { l: '9:16', v: 9/16 }, { l: 'Circle', v: 'round' }
                ].map(p => (
                  <button 
                    key={p.l} 
                    onClick={() => p.v === 'round' ? actions.toggleRound() : actions.setPresetRatio(p.v)} 
                    className={`py-2.5 rounded-lg text-xs font-medium transition border ${
                        (p.v === 'round' && settings.isRound) 
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Transforms */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Transform</label>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => actions.rotate(-90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-gray-300 text-xl">↺</button>
                <button onClick={() => actions.rotate(90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-gray-300 text-xl">↻</button>
                <button onClick={actions.flipHorizontal} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-gray-300 text-xl">⇄</button>
                <button onClick={actions.flipVertical} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-gray-300 text-xl">⇅</button>
              </div>
            </div>
          </div>
        )}

        {/* --- TUNE TAB --- */}
        {activeTab === 'tune' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Adjustments</h3>
                <button onClick={actions.resetFilters} className="text-xs text-gray-500 hover:text-white">Reset</button>
             </div>

             {['Brightness', 'Contrast', 'Saturation'].map(filter => (
               <div key={filter}>
                  <div className="flex justify-between text-sm text-gray-300 mb-3">
                    <span>{filter}</span>
                    <span className="font-mono text-yellow-500">{settings[filter.toLowerCase()]}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="200" 
                    value={settings[filter.toLowerCase()]} 
                    onChange={(e) => setSettings({...settings, [filter.toLowerCase()]: e.target.value})} 
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" 
                  />
               </div>
             ))}
          </div>
        )}

        {/* --- EXPORT TAB --- */}
        {activeTab === 'export' && (
          <div className="space-y-8">
             
             {/* Dimensions */}
             <div className="bg-gray-800/30 p-5 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-blue-400">Output Size</h3>
                  <select 
                    value={settings.unit} 
                    onChange={(e) => actions.handleUnitChange(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-xs text-white px-3 py-1.5 rounded-lg outline-none"
                  >
                    <option value="px">PX</option>
                    <option value="cm">CM</option>
                    <option value="mm">MM</option>
                    <option value="in">IN</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] text-gray-500 mb-1 block">Width</label>
                     <input type="number" placeholder="0" value={settings.customWidth} onChange={(e) => handleSizeInput(e, 'w')} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition text-white" />
                  </div>
                  <div>
                     <label className="text-[10px] text-gray-500 mb-1 block">Height</label>
                     <input type="number" placeholder="0" value={settings.customHeight} onChange={(e) => handleSizeInput(e, 'h')} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition text-white" />
                  </div>
                </div>
                
                {settings.unit !== 'px' && (
                    <div className="mt-4 flex items-center justify-between bg-gray-900 p-2 rounded-lg">
                        <label className="text-[10px] text-gray-400 pl-2">Print Quality</label>
                        <select 
                            value={settings.dpi}
                            onChange={(e) => setSettings({...settings, dpi: parseInt(e.target.value)})}
                            className="bg-transparent text-xs text-blue-400 font-bold outline-none"
                        >
                            <option value="72">72 DPI</option>
                            <option value="300">300 DPI</option>
                        </select>
                    </div>
                )}
             </div>

             {/* Format */}
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Format</label>
                <div className="flex gap-2">
                  {['image/png', 'image/jpeg', 'image/webp'].map((f) => (
                    <button key={f} onClick={() => setSettings({...settings, format: f})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition border ${settings.format === f ? 'bg-gray-800 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}>{f.split('/')[1].toUpperCase()}</button>
                  ))}
                </div>
             </div>

             {/* Quality */}
             {settings.format !== 'image/png' && (
                <div className="">
                  <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Quality</span><span>{Math.round(settings.quality * 100)}%</span></div>
                  <input type="range" min="0.1" max="1" step="0.1" value={settings.quality} onChange={(e) => setSettings({...settings, quality: parseFloat(e.target.value)})} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                </div>
             )}
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div className="p-6 border-t border-gray-800 bg-gray-900 z-20">
        <button onClick={actions.download} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-xl transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm tracking-wide">
          <span>⬇</span> DOWNLOAD
        </button>
        <button onClick={actions.cancel} className="w-full mt-4 text-gray-600 hover:text-white text-[10px] uppercase font-bold tracking-widest transition">
          Close
        </button>
      </div>
    </div>
  )
}