import { useState } from 'react'

export default function Sidebar({ settings, setSettings, actions }) {
  const [activeTab, setActiveTab] = useState('crop')

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
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition ${
              activeTab === tab.id 
                ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT - Scrollable Area */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        
        {/* --- CROP TAB --- */}
        {activeTab === 'crop' && (
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
              <button onClick={() => actions.setMode('move')} className={`py-2 rounded-lg text-xs font-bold transition ${settings.dragMode === 'move' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>✋ Pan Image</button>
              <button onClick={() => actions.setMode('crop')} className={`py-2 rounded-lg text-xs font-bold transition ${settings.dragMode === 'crop' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>⛶ Draw Crop</button>
            </div>

            {/* Round Toggle */}
             <button 
                onClick={actions.toggleRound} 
                className={`w-full py-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${settings.isRound ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
            >
                <div className={`w-4 h-4 rounded-full border-2 ${settings.isRound ? 'border-purple-400 bg-purple-400' : 'border-gray-500'}`}></div>
                {settings.isRound ? 'Circular Crop Active' : 'Enable Circular Crop'}
            </button>

            {/* Presets */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Aspect Ratio</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Free', v: NaN }, { l: '1:1', v: 1 }, { l: '16:9', v: 16/9 },
                  { l: '4:5', v: 4/5 }, { l: '9:16', v: 9/16 }, { l: '2:1', v: 2 }
                ].map(p => (
                  <button key={p.l} onClick={() => actions.setPresetRatio(p.v)} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2 rounded-lg text-xs font-medium transition">{p.l}</button>
                ))}
              </div>
            </div>

            {/* Transforms */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Transform</h3>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => actions.rotate(-90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg text-gray-300">↺</button>
                <button onClick={() => actions.rotate(90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg text-gray-300">↻</button>
                <button onClick={actions.flipHorizontal} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg text-gray-300">⇄</button>
                <button onClick={actions.flipVertical} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg text-gray-300">⇅</button>
              </div>
            </div>
          </div>
        )}

        {/* --- TUNE TAB --- */}
        {activeTab === 'tune' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-yellow-500 uppercase">Image Tuning</h3>
                <button onClick={actions.resetFilters} className="text-xs text-gray-500 underline hover:text-white">Reset</button>
             </div>

             {['Brightness', 'Contrast', 'Saturation'].map(filter => (
               <div key={filter}>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{filter}</span>
                    <span className="font-mono text-yellow-500">{settings[filter.toLowerCase()]}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="200" 
                    value={settings[filter.toLowerCase()]} 
                    onChange={(e) => setSettings({...settings, [filter.toLowerCase()]: e.target.value})} 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" 
                  />
               </div>
             ))}
          </div>
        )}

        {/* --- EXPORT TAB --- */}
        {activeTab === 'export' && (
          <div className="space-y-6">
             {/* Size */}
             <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800">
                <h3 className="text-xs font-bold text-blue-400 uppercase mb-3">Force Exact Dimensions</h3>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Width" value={settings.customWidth} onChange={(e) => actions.handleCustomSize(e.target.value, settings.customHeight)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition" />
                  <span className="text-gray-600">x</span>
                  <input type="number" placeholder="Height" value={settings.customHeight} onChange={(e) => actions.handleCustomSize(settings.customWidth, e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition" />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Leave empty to maintain aspect ratio.</p>
             </div>

             {/* Format */}
             <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">File Format</h3>
                <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                  {['image/png', 'image/jpeg', 'image/webp'].map((f) => (
                    <button key={f} onClick={() => setSettings({...settings, format: f})} className={`flex-1 py-2 rounded text-xs font-medium transition ${settings.format === f ? 'bg-gray-800 text-white shadow border border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}>{f.split('/')[1].toUpperCase()}</button>
                  ))}
                </div>
             </div>

             {/* Quality */}
             {settings.format !== 'image/png' && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Quality / Compression</span><span>{Math.round(settings.quality * 100)}%</span></div>
                  <input type="range" min="0.1" max="1" step="0.1" value={settings.quality} onChange={(e) => setSettings({...settings, quality: parseFloat(e.target.value)})} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                </div>
             )}
          </div>
        )}

      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-5 border-t border-gray-800 bg-gray-900">
        <button onClick={actions.download} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
          <span>⬇</span> Download Image
        </button>
        <button onClick={actions.cancel} className="w-full mt-3 text-gray-500 hover:text-red-400 text-xs uppercase font-bold tracking-wider transition">
          Start Over
        </button>
      </div>
    </div>
  )
}