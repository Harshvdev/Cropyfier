// src/components/panels/ResizePanel.jsx
export default function ResizePanel({ settings, setSettings, actions }) {
  
  // Safe handler to prevent non-numeric characters
  const handleInput = (val, type) => {
    // Allow empty string for backspace, otherwise ensure regex match for numbers
    if (val === "" || /^\d+$/.test(val)) {
        actions.handleCustomSize(val, type);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Unit</label>
          <select value={settings.unit} onChange={(e) => actions.handleUnitChange(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-xs text-white px-3 py-2.5 rounded-lg outline-none">
            <option value="px">Pixels (px)</option>
            <option value="cm">Centimeters (cm)</option>
            <option value="mm">Millimeters (mm)</option>
            <option value="in">Inches (in)</option>
          </select>
        </div>
        {settings.unit !== 'px' && (
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">DPI</label>
            <select value={settings.dpi} onChange={(e) => setSettings(s => ({ ...s, dpi: parseInt(e.target.value) }))} className="w-full bg-gray-800 border border-gray-700 text-xs text-white px-3 py-2.5 rounded-lg outline-none">
              <option value="72">Screen (72)</option>
              <option value="300">Print (300)</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide">Custom Size</h3>
          <button type="button" onClick={() => setSettings(s => ({ ...s, lockAspectRatio: !s.lockAspectRatio }))} className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded ${settings.lockAspectRatio ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
            <span className="text-xs">{settings.lockAspectRatio ? '🔒' : '🔓'}</span> Lock Ratio
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['Width', 'Height'].map((label) => (
            <div key={label} className="relative group">
              <label className="absolute top-2 left-3 text-[10px] text-gray-500 font-bold">{label[0]}</label>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Auto" 
                value={label === 'Width' ? settings.customWidth : settings.customHeight} 
                onChange={(e) => handleInput(e.target.value, label === 'Width' ? 'w' : 'h')} 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2.5 text-sm outline-none focus:border-blue-500 text-white" 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700/50">
         <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Resampling Mode</label>
         <select 
            value={settings.interpolation} 
            onChange={(e) => setSettings(s => ({ ...s, interpolation: e.target.value }))} 
            className="w-full bg-gray-900 border border-gray-700 text-xs text-white px-3 py-2.5 rounded-lg outline-none focus:border-blue-500"
         >
            <option value="high">Smooth (Bilinear) - Default</option>
            <option value="pixelated">Pixelated (Nearest Neighbor) - Best for Pixel Art</option>
         </select>
         <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">
            Use <strong>Smooth</strong> for photos. Use <strong>Pixelated</strong> if you are scaling up pixel art or screenshots to keep edges sharp.
         </p>
      </div>
    </div>
  );
}