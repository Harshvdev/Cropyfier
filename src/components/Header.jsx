// src/components/Header.jsx
export default function Header({ version, hasImage, onCancel }) {
  return (
    <header className="h-14 flex-shrink-0 flex justify-between items-center px-4 lg:px-6 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md z-50">
      
      {/* Logo Area */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
           <h1 className="text-lg font-bold tracking-tight text-white leading-none">Cropyfier</h1>
           <p className="text-[10px] text-gray-500 font-medium hidden sm:block">Professional Editor</p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {hasImage && (
            <button 
                onClick={onCancel}
                className="text-xs font-bold text-gray-400 hover:text-red-400 transition bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5"
            >
                New Image
            </button>
        )}
        <div className="hidden md:block text-gray-500 text-[10px] font-mono bg-white/5 border border-white/5 px-2 py-1 rounded-md">
            {version}
        </div>
      </div>
    </header>
  );
}