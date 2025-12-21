// src/components/panels/ExportPanel.jsx
export default function ExportPanel({ settings, setSettings, actions }) {
  return (
    <div className="space-y-6 animate-fade-in pb-4">
      {/* 1. Format Selection */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Format</label>
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl border border-gray-700/50">
          {['image/png', 'image/jpeg', 'image/webp'].map((f) => (
            <button key={f} type="button" onClick={() => setSettings(s => ({ ...s, format: f }))} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition ${settings.format === f ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
              {f.split('/')[1].toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {/* 2. Quality Slider */}
      {settings.format !== 'image/png' && (
        <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-400 mb-3 font-medium">
            <span>Quality</span><span>{Math.round(settings.quality * 100)}%</span>
          </div>
          <input type="range" min="0.1" max="1" step="0.1" value={settings.quality} onChange={(e) => setSettings(s => ({ ...s, quality: parseFloat(e.target.value) }))} className="w-full" />
        </div>
      )}

      {/* 3. Privacy Badge */}
      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start gap-3">
        <div className="text-green-400 mt-0.5">🛡️</div>
        <div>
          <h4 className="text-xs font-bold text-green-400">Privacy Active</h4>
          <p className="text-[10px] text-green-400/70 mt-1">Metadata is automatically stripped.</p>
        </div>
      </div>

      {/* 4. MAIN ACTION BUTTONS */}
      <div className="pt-4 border-t border-white/5 space-y-3">
         <button 
            type="button" 
            onClick={actions.download} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
         >
            <span>⬇</span> Export Image
         </button>

         <button 
            type="button" 
            onClick={actions.copyToClipboard} 
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] text-xs"
         >
            <span>📋</span> Copy to Clipboard
         </button>
      </div>
    </div>
  );
}