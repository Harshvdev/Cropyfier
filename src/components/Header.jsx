// src/components/Header.jsx
export default function Header({ version, hasImage, onCancel, onDownload }) {
  return (
    <header className="h-16 flex-shrink-0 flex justify-between items-center px-4 lg:px-6 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md z-50">
      
      {/* Logo Area */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
           <h1 className="text-lg font-bold tracking-tight text-white leading-none">Cropyfier</h1>
           <p className="text-[11px] text-gray-500 font-medium hidden sm:block">Professional Editor</p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {hasImage && (
            <>
                {/* Desktop Version Badge */}
                <div className="hidden lg:block text-gray-600 text-[10px] font-mono border border-gray-800 px-2 py-1 rounded-md mr-2">
                    {version}
                </div>

                <button 
                    onClick={onCancel}
                    className="text-xs font-bold text-gray-400 hover:text-white transition hover:bg-white/10 px-4 py-2 rounded-lg"
                >
                    Reset
                </button>

                {/* Primary Action Button - Moved from Export Panel to Header */}
                <button 
                    onClick={onDownload}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center gap-2"
                >
                    <span>Download</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
            </>
        )}
      </div>
    </header>
  );
}