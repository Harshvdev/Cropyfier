// src/components/panels/CropPanel.jsx
export default function CropPanel({ settings, setSettings, actions }) {
  
  const ratioPresets = [
    { label: "16:9", ratio: 16/9, icon: "🖥️" },
    { label: "4:3", ratio: 4/3, icon: "📺" },
    { label: "3:2", ratio: 3/2, icon: "📷" },
    { label: "2:3", ratio: 2/3, icon: "📱" },
    { label: "9:16", ratio: 9/16, icon: "📱" },
  ];

  const tools = [
    { icon: "↺", action: () => actions.rotate(-90), label: "Left" },
    { icon: "↻", action: () => actions.rotate(90), label: "Right" },
    { icon: "⇄", action: actions.flipHorizontal, label: "Flip H" },
    { icon: "⇅", action: actions.flipVertical, label: "Flip V" },
  ];

  const cols = Math.max(1, settings.gridCols || 1);
  const rows = Math.max(1, settings.gridRows || 1);
  const totalCells = cols * rows;

  return (
    <div className="space-y-6 animate-fade-in pb-2 text-gray-200">
      
      {/* 1. Geometry Tools */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase mb-3 block tracking-wide">Transform</label>
        <div className="grid grid-cols-4 gap-3">
            {tools.map((t, i) => (
                <button 
                    key={i} 
                    onClick={t.action}
                    className="bg-gray-800/50 hover:bg-gray-700 active:bg-gray-600 border border-gray-700/50 h-12 rounded-xl flex items-center justify-center text-xl text-gray-200 transition shadow-sm"
                    title={t.label}
                >
                    {t.icon}
                </button>
            ))}
        </div>
      </div>

      {/* 2. Standard Shapes */}
      {!settings.gridSplitActive && (
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-3 block tracking-wide">Standard</label>
          <div className="grid grid-cols-3 gap-3">
              {/* Free / View Toggle */}
              <button
                  onClick={actions.setFree}
                  className={`h-14 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center gap-1 ${
                      settings.selectedPreset === "free"
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : settings.selectedPreset === "view"
                        ? "bg-green-600/20 border-green-500 text-green-400" 
                        : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
                  }`}
              >
                  <span className="opacity-70 text-sm">
                      {settings.selectedPreset === "view" ? "👁️" : "📐"}
                  </span>
                  <span>{settings.selectedPreset === "view" ? "View Only" : "Free"}</span>
              </button>

              {/* Square */}
              <button
                  onClick={() => actions.setPresetRatio(1, "Square")}
                  className={`h-14 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center gap-1 ${
                      settings.selectedPreset === "Square" && !settings.isRound
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
                  }`}
              >
                  <span className="opacity-70 text-sm">1:1</span>
                  <span>Square</span>
              </button>

              {/* Circle */}
              <button
                  onClick={actions.toggleRound}
                  className={`h-14 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center gap-1 ${
                      settings.isRound
                      ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
                  }`}
              >
                  <span className="opacity-70 text-sm">⚪</span>
                  <span>Circle</span>
              </button>
          </div>
        </div>
      )}

      {/* 3. Fixed Ratios */}
      {!settings.gridSplitActive && (
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-3 block tracking-wide">Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-3">
              {ratioPresets.map(p => (
                  <button
                      key={p.label}
                      onClick={() => actions.setPresetRatio(p.ratio, p.label)}
                      className={`h-11 rounded-lg text-xs font-medium transition border flex items-center justify-center gap-2 ${
                          settings.selectedPreset === p.label && !settings.isRound
                          ? "bg-blue-600 border-blue-500 text-white shadow"
                          : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
                      }`}
                  >
                      <span className="opacity-50 text-[10px]">{p.icon}</span>
                      <span>{p.label}</span>
                  </button>
              ))}
          </div>
        </div>
      )}

      {/* 4. Grid Splitter Section */}
      <div className="border-t border-gray-800/60 pt-6">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                Grid Splitter
             </h3>
             <label className="relative inline-flex items-center cursor-pointer">
               <input 
                 type="checkbox" 
                 className="sr-only peer" 
                 checked={settings.gridSplitActive} 
                 onChange={() => {
                     setSettings(s => ({ ...s, gridSplitActive: !s.gridSplitActive, gridSelectedIndex: 0 }));
                 }} 
               />
               <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
             </label>
          </div>

          {settings.gridSplitActive && (
              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl space-y-4 animate-fade-in">
                  {/* Columns & Rows inputs */}
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Columns</label>
                        <input 
                           type="number" 
                           min="1" 
                           max="20" 
                           value={settings.gridCols} 
                           onChange={(e) => {
                               const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                               setSettings(s => ({ ...s, gridCols: val, gridSelectedIndex: 0 }));
                           }}
                           className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Rows</label>
                        <input 
                           type="number" 
                           min="1" 
                           max="20" 
                           value={settings.gridRows} 
                           onChange={(e) => {
                               const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                               setSettings(s => ({ ...s, gridRows: val, gridSelectedIndex: 0 }));
                           }}
                           className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                     </div>
                  </div>

                  {/* Edit mode selector */}
                  <div className="flex items-center justify-between bg-gray-900/50 p-2.5 rounded-lg border border-gray-700/50">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-300 font-bold">Edit Mode</span>
                        <span className="text-[8px] text-gray-500">Apply edits to all or single piece</span>
                     </div>
                     <div className="flex bg-gray-800 p-0.5 rounded-md border border-gray-750">
                        <button
                           type="button"
                           onClick={() => setSettings(s => ({ ...s, gridEditMode: 'all' }))}
                           className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-all ${
                               settings.gridEditMode === 'all'
                               ? 'bg-blue-600 text-white shadow'
                               : 'text-gray-400 hover:text-gray-200'
                           }`}
                        >
                           All
                        </button>
                        <button
                           type="button"
                           onClick={() => setSettings(s => ({ ...s, gridEditMode: 'individual' }))}
                           className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-all ${
                               settings.gridEditMode === 'individual'
                               ? 'bg-blue-600 text-white shadow'
                               : 'text-gray-400 hover:text-gray-200'
                           }`}
                        >
                           Piece
                        </button>
                     </div>
                  </div>

                  {/* View mode toggle */}
                  <div className="flex items-center justify-between bg-gray-900/50 p-2.5 rounded-lg border border-gray-700/50">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-300 font-bold">View Selected Only</span>
                        <span className="text-[8px] text-gray-500">Isolate active grid cell</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="sr-only peer" 
                         checked={settings.gridSinglePieceView} 
                         onChange={() => setSettings(s => ({ ...s, gridSinglePieceView: !s.gridSinglePieceView }))} 
                       />
                       <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                     </label>
                  </div>

                  {/* Navigation & Piece info */}
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 space-y-2">
                     <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400">Selected:</span>
                        <span className="font-bold text-blue-400 uppercase">
                           Piece {settings.gridSelectedIndex + 1} of {totalCells}
                        </span>
                     </div>
                     
                     <div className="flex gap-2">
                        <button 
                           type="button"
                           disabled={settings.gridSelectedIndex === 0}
                           onClick={() => setSettings(s => ({ ...s, gridSelectedIndex: s.gridSelectedIndex - 1 }))}
                           className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-[10px] font-bold rounded border border-gray-700 transition"
                        >
                           ◀ Prev
                        </button>
                        <button 
                           type="button"
                           disabled={settings.gridSelectedIndex >= totalCells - 1}
                           onClick={() => setSettings(s => ({ ...s, gridSelectedIndex: s.gridSelectedIndex + 1 }))}
                           className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-[10px] font-bold rounded border border-gray-700 transition"
                        >
                           Next ▶
                        </button>
                     </div>
                  </div>

                  {/* Visual cell selector */}
                  <div>
                     <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1.5">Interactive Selector</label>
                     <div className="border border-gray-850 p-2.5 rounded-lg bg-black/40 flex justify-center items-center" style={{ minHeight: '100px' }}>
                        <div 
                           className="grid gap-1 w-full max-w-[120px] aspect-square"
                           style={{
                               gridTemplateColumns: `repeat(${cols}, 1fr)`,
                               gridTemplateRows: `repeat(${rows}, 1fr)`
                           }}
                        >
                           {Array.from({ length: totalCells }).map((_, idx) => {
                               const isSelected = idx === settings.gridSelectedIndex;
                               return (
                                   <button
                                       key={idx}
                                       type="button"
                                       onClick={() => setSettings(s => ({ ...s, gridSelectedIndex: idx }))}
                                       className={`rounded transition-all ${
                                           isSelected 
                                           ? 'bg-blue-500 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                                           : 'bg-gray-800 hover:bg-gray-700 border border-gray-700/60'
                                       }`}
                                   />
                               );
                           })}
                        </div>
                     </div>
                  </div>

              </div>
          )}
      </div>
    </div>
  );
}