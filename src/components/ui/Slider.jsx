// src/components/ui/Slider.jsx
export default function Slider({ label, value, min, max, onChange, unit = "", step }) {
  const effectiveStep = step || (max <= 1 ? 0.01 : 1);
  const percentage = ((value - min) / (max - min)) * 100;

  // Smart Display Logic
  let displayValue = value;
  if (unit === "%") displayValue = Math.round(value);
  else if (unit === "px") displayValue = Math.round(value); // Clean display for px
  else displayValue = value.toFixed(2); 

  return (
    <div className="group py-1">
      <div className="flex justify-between text-xs text-gray-300 mb-2 font-medium">
        <span>{label}</span>
        <span className="font-mono text-blue-400 bg-blue-500/10 px-1.5 rounded">
           {displayValue}{unit}
        </span>
      </div>
      <div className="relative h-8 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={effectiveStep}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="z-10 opacity-0 absolute inset-0 w-full h-full cursor-pointer touch-none"
        />
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div
          className="absolute h-5 w-5 bg-white rounded-full shadow-lg border-2 border-blue-500 pointer-events-none transition-all duration-75"
          style={{ left: `calc(${percentage}% - 10px)` }}
        ></div>
      </div>
    </div>
  );
}