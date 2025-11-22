export default function CropPanel({ settings, actions }) {
  const socialPresets = [
    { label: "IG Post", ratio: 1, icon: "📸", desc: "1080 x 1080" },
    { label: "IG Portrait", ratio: 4 / 5, icon: "📸", desc: "1080 x 1350" },
    { label: "IG Story", ratio: 9 / 16, icon: "📱", desc: "1080 x 1920" },
    { label: "Twit Header", ratio: 3 / 1, icon: "🐦", desc: "1500 x 500" },
    { label: "Twit Post", ratio: 16 / 9, icon: "🐦", desc: "1600 x 900" },
    { label: "YT Cover", ratio: 16 / 9, icon: "▶️", desc: "2560 x 1440" },
    { label: "FB Cover", ratio: 2.63, icon: "👍", desc: "820 x 312" },
    { label: "Linked Cover", ratio: 4 / 1, icon: "💼", desc: "1584 x 396" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      
      {/* BASIC RATIOS */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Standard Shapes</label>
        <div className="grid grid-cols-3 gap-2">
          <button
              type="button"
              onClick={actions.setFree} 
              className={`h-12 rounded-lg text-xs font-medium transition border flex flex-col items-center justify-center ${
                settings.selectedPreset === "free"
                  ? "bg-blue-500/10 border-blue-500 text-blue-400"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span className="font-bold">Free</span>
              <span className="text-[9px] opacity-60">Custom</span>
          </button>

          <button
              type="button"
              onClick={() => actions.setPresetRatio(1, "Square")}
              className={`h-12 rounded-lg text-xs font-medium transition border flex flex-col items-center justify-center ${
                settings.selectedPreset === "Square" && !settings.isRound
                  ? "bg-blue-500/10 border-blue-500 text-blue-400"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span className="font-bold">Square</span>
              <span className="text-[9px] opacity-60">1:1</span>
          </button>

          <button
              type="button"
              onClick={actions.toggleRound}
              className={`h-12 rounded-lg text-xs font-medium transition border flex flex-col items-center justify-center ${
                settings.isRound
                  ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span className="font-bold">{settings.isRound ? "Circle On" : "Circle"}</span>
              <span className="text-[9px] opacity-60">Round</span>
          </button>
        </div>
      </div>

      {/* SOCIAL MEDIA */}
      <div>
         <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Social Media Presets</label>
         <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
            {socialPresets.map(p => (
              <button 
                key={p.label}
                type="button"
                onClick={() => actions.setPresetRatio(p.ratio, p.label)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition text-left group active:bg-gray-700 ${
                  settings.selectedPreset === p.label && !settings.isRound
                  ? "bg-blue-900/20 border-blue-500"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
                }`}
              >
                 <span className="text-lg opacity-70 grayscale group-hover:grayscale-0 transition">{p.icon}</span>
                 <div className="flex flex-col overflow-hidden min-w-0">
                    <span className={`text-xs font-bold truncate w-full ${settings.selectedPreset === p.label && !settings.isRound ? "text-blue-400" : "text-gray-200"}`}>
                      {p.label}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono truncate">{p.desc}</span>
                 </div>
              </button>
            ))}
         </div>
      </div>

      {/* GEOMETRY */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Geometry</label>
        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => actions.rotate(-90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white flex items-center justify-center" title="Rotate Left"><span className="text-lg">↺</span></button>
          <button type="button" onClick={() => actions.rotate(90)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white flex items-center justify-center" title="Rotate Right"><span className="text-lg">↻</span></button>
          <button type="button" onClick={actions.flipHorizontal} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white flex items-center justify-center" title="Flip Horizontal"><span className="text-lg">⇄</span></button>
          <button type="button" onClick={actions.flipVertical} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-3 rounded-xl text-white flex items-center justify-center" title="Flip Vertical"><span className="text-lg">⇅</span></button>
        </div>
      </div>
    </div>
  );
}