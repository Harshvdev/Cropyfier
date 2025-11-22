export default function UploadArea({ onFileChange }) {
  return (
    <div className="w-full max-w-xl p-12 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-800/30 hover:bg-gray-800/60 transition flex flex-col items-center justify-center text-center h-[60vh]">
      <div className="mb-6 p-5 bg-gray-800 rounded-full shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold mb-3 text-white">Upload Image</h2>
      <p className="text-gray-400 mb-8">JPG, PNG, or WEBP</p>
      <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-blue-500/20 transition transform hover:scale-105 active:scale-95">
        Choose File
        <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
      </label>
    </div>
  )
}