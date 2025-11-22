export default function Header({ version }) {
  return (
    <header className="h-16 flex-shrink-0 flex justify-between items-center px-6 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">
          Cropyfier
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-xs text-gray-500 uppercase tracking-widest font-semibold">
          100% Local • Private
        </span>
        <div className="text-gray-400 text-[10px] font-mono bg-gray-900 border border-gray-800 px-2 py-1 rounded-md">
          {version}
        </div>
      </div>
    </header>
  );
}