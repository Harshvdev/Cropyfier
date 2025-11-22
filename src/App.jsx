import { useState, useRef } from 'react'
import Cropper from 'react-cropper'
import "cropperjs/dist/cropper.css"

function App() {
  const [image, setImage] = useState(null)
  
  // Transform States
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  
  // Custom Size States
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')

  // Export States
  const [format, setFormat] = useState('image/png')
  const [quality, setQuality] = useState(0.9)

  // UI State to highlight active tool
  const [dragMode, setDragModeState] = useState('crop') 

  const cropperRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result)
        reset()
      }
      reader.readAsDataURL(file)
    }
  }

  const getCropData = () => {
    const imageElement = cropperRef.current
    const cropper = imageElement?.cropper

    if (cropper) {
      const options = { fillColor: '#fff' }
      if (customWidth && customHeight) {
        options.width = parseInt(customWidth)
        options.height = parseInt(customHeight)
      }

      const croppedCanvas = cropper.getCroppedCanvas(options)
      if (!croppedCanvas) return

      const imageUrl = croppedCanvas.toDataURL(format, quality)
      
      let extension = 'png'
      if (format === 'image/jpeg') extension = 'jpg'
      if (format === 'image/webp') extension = 'webp'

      const link = document.createElement('a')
      link.download = `cropyfier-edit.${extension}`
      link.href = imageUrl
      link.click()
    }
  }

  // --- TOOLS ---

  // New function to toggle between Moving the image and Cropping
  const setMode = (mode) => {
    cropperRef.current?.cropper?.setDragMode(mode)
    setDragModeState(mode)
  }

  const setPresetRatio = (ratio) => {
    setCustomWidth('')
    setCustomHeight('')
    cropperRef.current?.cropper?.setAspectRatio(ratio)
  }

  const handleCustomSize = (w, h) => {
    setCustomWidth(w)
    setCustomHeight(h)
    if (w && h) {
      cropperRef.current?.cropper?.setAspectRatio(w / h)
    }
  }

  const rotate = (deg) => {
    cropperRef.current?.cropper?.rotate(deg)
  }

  const flipHorizontal = () => {
    const newScale = scaleX === 1 ? -1 : 1
    cropperRef.current?.cropper?.scaleX(newScale)
    setScaleX(newScale)
  }

  const flipVertical = () => {
    const newScale = scaleY === 1 ? -1 : 1
    cropperRef.current?.cropper?.scaleY(newScale)
    setScaleY(newScale)
  }

  const reset = () => {
    cropperRef.current?.cropper?.reset()
    setScaleX(1)
    setScaleY(1)
    setCustomWidth('')
    setCustomHeight('')
    setFormat('image/png')
    setQuality(0.9)
    setMode('crop') // Default back to crop
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-6xl flex justify-between items-center py-6 mb-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Cropyfier
        </h1>
        <div className='text-gray-500 text-sm'>v1.3</div>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center">
        
        {!image && (
          <div className="w-full max-w-xl p-12 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-800/50 hover:bg-gray-800 transition flex flex-col items-center justify-center text-center h-80">
            <div className="mb-6 p-5 bg-gray-700/50 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Upload Photo</h2>
            <p className="text-gray-400 mb-6">Support for JPG, PNG, WEBP</p>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-blue-500/20 transition transform hover:scale-105">
              Select Image
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {image && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* EDITOR CANVAS */}
            <div className="lg:col-span-3 bg-black/40 p-4 rounded-2xl border border-gray-800 flex items-center justify-center shadow-2xl">
              <Cropper
                ref={cropperRef}
                style={{ height: 600, width: "100%" }}
                initialAspectRatio={NaN}
                src={image}
                viewMode={1}
                guides={true}
                minCropBoxHeight={10}
                minCropBoxWidth={10}
                background={false}
                responsive={true}
                autoCropArea={1}
                checkOrientation={false}
                dragMode={dragMode} // This controls the behavior
              />
            </div>

            {/* SIDEBAR CONTROLS */}
            <div className="flex flex-col gap-6 bg-gray-800 p-6 rounded-2xl border border-gray-700 h-fit shadow-xl overflow-y-auto max-h-[800px]">
              
              {/* 1. Interaction Mode (NEW) */}
              <div className="bg-blue-900/20 border border-blue-800/50 p-3 rounded-xl">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setMode('move')}
                    className={`py-2 rounded-lg text-sm transition flex items-center justify-center gap-2 ${
                      dragMode === 'move' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>✋</span> Move
                  </button>
                  <button 
                    onClick={() => setMode('crop')}
                    className={`py-2 rounded-lg text-sm transition flex items-center justify-center gap-2 ${
                      dragMode === 'crop' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>⛶</span> Crop
                  </button>
                </div>
              </div>

              {/* 2. Output Size */}
              <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Output Size (px)</h3>
                 <div className="flex gap-2 items-center">
                    <input type="number" placeholder="W" value={customWidth} onChange={(e) => handleCustomSize(e.target.value, customHeight)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <span className="text-gray-500">x</span>
                    <input type="number" placeholder="H" value={customHeight} onChange={(e) => handleCustomSize(customWidth, e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                 </div>
              </div>

              {/* 3. Aspect Ratios */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Presets</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setPresetRatio(NaN)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs transition">Free</button>
                  <button onClick={() => setPresetRatio(1)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs transition">1:1</button>
                  <button onClick={() => setPresetRatio(16/9)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs transition">16:9</button>
                  <button onClick={() => setPresetRatio(4/5)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs transition">4:5</button>
                  <button onClick={() => setPresetRatio(9/16)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs transition">9:16</button>
                  <button onClick={() => setPresetRatio(2/1)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs transition">2:1</button>
                </div>
              </div>

              {/* 4. Transform */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Transform</h3>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => rotate(-90)} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition">↺</button>
                  <button onClick={() => rotate(90)} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition">↻</button>
                  <button onClick={flipHorizontal} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition">⇄</button>
                  <button onClick={flipVertical} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition">⇅</button>
                </div>
              </div>

              {/* 5. Export Options */}
              <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700">
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">Export Settings</h3>
                <div className="flex gap-1 mb-4 bg-gray-900 p-1 rounded-lg">
                  {['image/png', 'image/jpeg', 'image/webp'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                        format === f ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {f.split('/')[1].toUpperCase()}
                    </button>
                  ))}
                </div>
                {format !== 'image/png' && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Quality</span>
                      <span>{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* 6. Action Buttons */}
              <div className="mt-2 flex flex-col gap-3">
                <button 
                  onClick={getCropData}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="text-xl">⬇</span> Download
                </button>
                <button 
                  onClick={() => setImage(null)}
                  className="w-full bg-gray-900 hover:bg-red-900/30 text-gray-400 hover:text-red-400 py-3 px-4 rounded-xl transition border border-gray-700"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App