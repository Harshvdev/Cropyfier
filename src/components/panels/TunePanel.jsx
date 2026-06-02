// src/components/panels/TunePanel.jsx
import Slider from "../ui/Slider";

export default function TunePanel({ settings, setSettings, actions }) {
  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Adjustments</h3>
        <button type="button" onClick={actions.resetFilters} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase">Reset</button>
      </div>

      <Slider label="Brightness" value={settings.brightness} min={0} max={200} onChange={(v) => update('brightness', v)} unit="%" />
      <Slider label="Contrast" value={settings.contrast} min={0} max={200} onChange={(v) => update('contrast', v)} unit="%" />
      <Slider label="Saturation" value={settings.saturation} min={0} max={200} onChange={(v) => update('saturation', v)} unit="%" />
      <Slider label="Blur" value={settings.blur} min={0} max={20} onChange={(v) => update('blur', v)} unit="px" />

      {/* MAGIC ERASER SECTION */}
      <div className="border-t border-gray-800 pt-6">
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
               Magic Eraser <span className="bg-purple-500/20 text-purple-300 px-1.5 rounded text-[8px]">PRO</span>
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.removeColorActive} 
                onChange={() => {
                   // Auto-enable preview when turning on
                   update('removeColorActive', !settings.removeColorActive);
                   if(!settings.removeColorActive) update('showMaskPreview', true);
                }} 
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
         </div>

         {settings.removeColorActive && (
            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl space-y-4 animate-fade-in">
               
               {/* Color & Picker */}
               <div className="flex items-center gap-3">
                  <div className="flex-1">
                     <label className="text-[9px] font-bold text-purple-300 uppercase block mb-1">Target Color</label>
                     <div className="flex gap-2">
                        <input 
                           type="color" 
                           value={settings.removeColorHex} 
                           onChange={(e) => update('removeColorHex', e.target.value)} 
                           className="h-9 w-12 bg-transparent cursor-pointer rounded overflow-hidden p-0 border-0"
                        />
                        <button 
                           type="button" 
                           onClick={actions.togglePicker}
                           className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded px-3 transition text-gray-300 flex items-center justify-center gap-2 border border-gray-700"
                        >
                           <span>🖊️</span> Pick Color
                        </button>
                     </div>
                  </div>
               </div>
               
               {/* SLIDERS (Verified Working with new canvasUtils) */}
               <Slider 
                  label="Color Similarity" 
                  value={settings.removeTolerance} 
                  min={1} 
                  max={60} 
                  onChange={(v) => update('removeTolerance', v)} 
               />
               
               <Slider 
                  label="Shrink Edges (Pixels)" 
                  value={settings.removeErosion} 
                  min={0} 
                  max={5} 
                  onChange={(v) => update('removeErosion', v)} 
                  unit="px"
               />
               
               {/* HIGHLIGHT TOGGLE */}
               <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                  <span className="text-[10px] text-gray-300 font-bold">Show Red Highlight</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.showMaskPreview} onChange={() => update('showMaskPreview', !settings.showMaskPreview)} />
                    <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                  </label>
               </div>

               {/* PROTECTION BRUSH */}
               <button 
                   type="button"
                   onClick={() => update('brushActive', !settings.brushActive)}
                   className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition border ${
                       settings.brushActive 
                       ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/20" 
                       : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                   }`}
               >
                   <span>{settings.brushActive ? "🛑 Stop Protecting" : "🛡️ Protect Area (Brush)"}</span>
               </button>

               <p className="text-[9px] text-gray-400 leading-relaxed">
                  1. Areas in <strong>Red</strong> will be removed.<br/>
                  2. Use <strong>Protect Area</strong> to draw over parts you want to keep.<br/>
                  3. Click <strong>Save Step</strong> at the top to apply changes.
               </p>
            </div>
         )}
      </div>

      <div className="border-t border-gray-800 pt-6">
        <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block tracking-wider">Filters</label>
        <div className="grid grid-cols-4 gap-2">
          <FilterBtn label="B&W" active={settings.grayscale > 0} onClick={() => update('grayscale', settings.grayscale ? 0 : 100)} color="blue" />
          <FilterBtn label="Sepia" active={settings.sepia > 0} onClick={() => update('sepia', settings.sepia ? 0 : 100)} color="yellow" />
          <FilterBtn label="Invert" active={settings.invert > 0} onClick={() => update('invert', settings.invert ? 0 : 100)} color="purple" />
          <button type="button" onClick={() => update('hue', (settings.hue + 90) % 360)} className={`p-2 rounded-lg text-[10px] font-bold border transition relative flex items-center justify-center ${settings.hue > 0 ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
            Hue {settings.hue > 0 && <span className="absolute -top-2 -right-2 bg-white text-black text-[8px] px-1 rounded-full shadow">{settings.hue}°</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterBtn({ label, active, onClick, color }) {
  const colors = {
    blue: "bg-blue-600 border-blue-500",
    yellow: "bg-yellow-700 border-yellow-600",
    purple: "bg-purple-600 border-purple-500"
  };
  return (
    <button type="button" onClick={onClick} className={`p-2 rounded-lg text-[10px] font-bold border transition ${active ? `${colors[color]} text-white` : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
      {label}
    </button>
  );
}