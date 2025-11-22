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

      <div>
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