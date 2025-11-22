export default function UploadArea({ onFileChange }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-950">
      <div className="w-full max-w-lg relative group cursor-pointer">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
        <div className="relative w-full p-12 border border-gray-800 rounded-3xl bg-gray-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-center hover:bg-gray-900 transition-all duration-300">
          <div className="mb-6 p-6 bg-gray-800 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Start Editing</h2>
          <p className="text-gray-500 mb-8 text-sm">Drag & drop or click to browse.<br/>Supports JPG, PNG, WEBP.</p>
          <label className="cursor-pointer bg-white text-black hover:bg-blue-50 px-8 py-3 rounded-xl font-bold shadow-lg shadow-white/10 transition transform active:scale-95 flex items-center gap-2">
            Select Image
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={onFileChange} 
            />
          </label>
        </div>
      </div>
    </div>
  );
}