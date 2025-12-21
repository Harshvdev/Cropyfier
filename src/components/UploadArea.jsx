export default function UploadArea({ onFileChange }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden h-full w-full">
      
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="relative group cursor-pointer">
          {/* FIX: Removed 'block', kept 'flex' */}
          <label className="w-full aspect-[4/3] border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-3xl bg-gray-900/50 backdrop-blur-sm transition-all duration-300 flex flex-col items-center justify-center gap-4 hover:bg-gray-800/50 group-hover:scale-[1.01] shadow-2xl">
            
            <div className="p-4 bg-gray-800 rounded-2xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <svg className="w-8 h-8 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            
            <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-white">Upload Image</h2>
                <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
            </div>

            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={onFileChange} 
            />
          </label>
        </div>
        
        <div className="mt-8 flex justify-center gap-4 text-xs text-gray-500 font-mono">
            <span className="bg-white/5 px-2 py-1 rounded">JPG</span>
            <span className="bg-white/5 px-2 py-1 rounded">PNG</span>
            <span className="bg-white/5 px-2 py-1 rounded">WEBP</span>
        </div>
      </div>
    </div>
  );
}