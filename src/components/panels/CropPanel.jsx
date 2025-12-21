// src/components/panels/CropPanel.jsx
export default function CropPanel({ settings, actions }) {
  
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

  return (
    <div className="space-y-6 animate-fade-in pb-2">
      
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
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase mb-3 block tracking-wide">Standard</label>
        <div className="grid grid-cols-3 gap-3">
            {/* Free */}
            <button
                onClick={actions.setFree}
                className={`h-14 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center gap-1 ${
                    settings.selectedPreset === "free"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                    : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
                }`}
            >
                <span className="opacity-70 text-sm">📐</span>
                <span>Free</span>
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

      {/* 3. Fixed Ratios */}
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
    </div>
  );
}