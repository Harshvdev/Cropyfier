import { useState, useRef } from 'react'
import Cropper from 'react-cropper'
import "cropperjs/dist/cropper.css"

function App() {
  const [image, setImage] = useState(null)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  
  // New State for Custom Dimensions
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  
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
      // Configuration for the output image
      const options = {
        fillColor: '#fff', // Fills transparency with white (optional)
      }

      // If user specified dimensions, force the output to be that size
      if (customWidth && customHeight) {
        options.width = parseInt(customWidth)
        options.height = parseInt(customHeight)
      }

      const croppedCanvas = cropper.getCroppedCanvas(options)
      
      if (!croppedCanvas) {
        alert("Could not create crop.")
        return
      }

      const imageUrl = croppedCanvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'cropyfier-edit.png'
      link.href = imageUrl
      link.click()
    }
  }

  // --- TOOLS ---

  // When user clicks a Preset (like Square), we clear the custom pixel inputs
  // because "Square" is a ratio, not a specific pixel size.
  const setPresetRatio = (ratio) => {
    setCustomWidth('')
    setCustomHeight('')
    cropperRef.current?.cropper?.setAspectRatio(ratio)
  }

  // When user types in pixels, we enforce that ratio immediately
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
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-6xl flex justify-between items-center py-6 mb-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Cropyfier
        </h1>
        <div className='text-gray-500 text-sm'>v1.1</div>
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
              />
            </div>

            {/* SIDEBAR CONTROLS */}
            <div className="flex flex-col gap-6 bg-gray-800 p-6 rounded-2xl border border-gray-700 h-fit shadow-xl overflow-y-auto max-h-[800px]">
              
              {/* 1. Custom Size Inputs (NEW) */}
              <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700">
                 <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Output Size (px)</h3>
                 <div className="flex gap-2 items-center">
                    <input 
                      type="number" 
                      placeholder="Width" 
                      value={customWidth}
                      onChange={(e) => handleCustomSize(e.target.value, customHeight)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-gray-500">x</span>
                    <input 
                      type="number" 
                      placeholder="Height" 
                      value={customHeight}
                      onChange={(e) => handleCustomSize(customWidth, e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <p className="text-xs text-gray-500 mt-2">Leaving this empty crops at original resolution.</p>
              </div>

              {/* 2. Aspect Ratios */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPresetRatio(NaN)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition border border-gray-600">Free</button>
                  <button onClick={() => setPresetRatio(1)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition border border-gray-600">Square (1:1)</button>
                  <button onClick={() => setPresetRatio(16/9)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition border border-gray-600">YouTube (16:9)</button>
                  <button onClick={() => setPresetRatio(4/5)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition border border-gray-600">Portrait (4:5)</button>
                  <button onClick={() => setPresetRatio(9/16)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition border border-gray-600">Story (9:16)</button>
                  <button onClick={() => setPresetRatio(2/1)} className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition border border-gray-600">Twitter (2:1)</button>
                </div>
              </div>

              {/* 3. Transform Tools */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Transform</h3>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => rotate(-90)} title="Rotate Left" className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition border border-gray-600">↺</button>
                  <button onClick={() => rotate(90)} title="Rotate Right" className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition border border-gray-600">↻</button>
                  <button onClick={flipHorizontal} title="Flip Horizontal" className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition border border-gray-600">⇄</button>
                  <button onClick={flipVertical} title="Flip Vertical" className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-xl transition border border-gray-600">⇅</button>
                </div>
                <button onClick={reset} className="w-full mt-2 text-xs text-gray-400 hover:text-white underline">Reset Transforms</button>
              </div>

              {/* 4. Actions */}
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-700 pt-6">
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