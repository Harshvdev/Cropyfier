export default function ExportPanel({ settings, setSettings }) {
  return (
    <div className="space-y-6 animate-fade-in">
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
      
      {settings.format !== 'image/png' && (
        <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-400 mb-3 font-medium">
            <span>Quality</span><span>{Math.round(settings.quality * 100)}%</span>
          </div>
          <input type="range" min="0.1" max="1" step="0.1" value={settings.quality} onChange={(e) => setSettings(s => ({ ...s, quality: parseFloat(e.target.value) }))} className="w-full" />
        </div>
      )}

      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start gap-3">
        <div className="text-green-400 mt-0.5">🛡️</div>
        <div>
          <h4 className="text-xs font-bold text-green-400">Privacy Active</h4>
          <p className="text-[10px] text-green-400/70 mt-1">Metadata is automatically stripped.</p>
        </div>
      </div>
    </div>
  );
}