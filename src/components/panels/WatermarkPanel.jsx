import Slider from "../ui/Slider";

export default function WatermarkPanel({ settings, setSettings }) {
  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700/50">
         <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Watermark Text</label>
         <input 
            type="text" 
            placeholder="© Your Name"
            value={settings.watermarkText}
            onChange={(e) => update('watermarkText', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-sm outline-none focus:border-blue-500 text-white placeholder-gray-600"
         />
      </div>

      {settings.watermarkText && (
        <>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Position</label>
            <div className="grid grid-cols-3 gap-2 bg-gray-800/50 p-2 rounded-xl">
              {['Top-Left', 'Top', 'Top-Right', 'Left', 'Center', 'Right', 'Bottom-Left', 'Bottom', 'Bottom-Right'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => update('watermarkPos', pos)}
                  className={`h-8 rounded text-[10px] font-bold transition ${
                    settings.watermarkPos === pos 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {/* Visual Dots for position */}
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto ${settings.watermarkPos === pos ? 'bg-white' : 'bg-gray-500'}`}></div>
                </button>
              ))}
            </div>
          </div>

          <Slider label="Size" value={settings.watermarkSize} min={10} max={200} onChange={(v) => update('watermarkSize', v)} unit="px" />
          <Slider label="Opacity" value={settings.watermarkOpacity} min={0.1} max={1} step={0.1} onChange={(v) => update('watermarkOpacity', v)} />
          
          <div className="flex items-center justify-between bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
             <label className="text-[10px] font-bold text-gray-500 uppercase">Color</label>
             <div className="flex gap-2">
                <input 
                   type="color" 
                   value={settings.watermarkColor}
                   onChange={(e) => update('watermarkColor', e.target.value)}
                   className="h-8 w-12 bg-transparent cursor-pointer rounded overflow-hidden p-0 border-0"
                />
             </div>
          </div>
        </>
      )}
    </div>
  );
}