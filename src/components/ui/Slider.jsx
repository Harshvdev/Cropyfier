export default function Slider({ label, value, min, max, onChange, unit = "" }) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="group">
      <div className="flex justify-between text-xs text-gray-300 mb-3 font-medium">
        <span>{label}</span>
        <span className="font-mono text-blue-400">{Math.round(value)}{unit}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={max <= 20 ? 0.5 : 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="z-10 opacity-0 absolute inset-0 w-full h-full cursor-pointer"
        />
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div
          className="absolute h-4 w-4 bg-white rounded-full shadow-lg border-2 border-blue-500 pointer-events-none transition-all duration-75"
          style={{ left: `calc(${percentage}% - 8px)` }}
        ></div>
      </div>
    </div>
  );
}