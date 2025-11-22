import { useState, useRef } from 'react'
import Cropper from 'react-cropper'
import "cropperjs/dist/cropper.css"

import Header from './components/Header'
import UploadArea from './components/UploadArea'
import Sidebar from './components/Sidebar'

function App() {
  const [image, setImage] = useState(null)
  const cropperRef = useRef(null)
  
  // Central State for all settings
  const [settings, setSettings] = useState({
    scaleX: 1, scaleY: 1, rotation: 0,
    customWidth: '', customHeight: '',
    format: 'image/png', quality: 0.9,
    dragMode: 'crop', isRound: false,
    brightness: 100, contrast: 100, saturation: 100,
    unit: 'px', dpi: 300
  })

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result)
        // Reset defaults
        setSettings(s => ({ ...s, scaleX: 1, scaleY: 1, rotation: 0, brightness: 100, contrast: 100, saturation: 100, isRound: false, unit: 'px', customWidth: '', customHeight: '' }))
      }
      reader.readAsDataURL(file)
    }
  }

  // The Heavy Lifting: Crop + Filter + Unit Conversion
  const getCropData = () => {
    const cropper = cropperRef.current?.cropper
    if (!cropper) return

    const options = {
      fillColor: settings.format === 'image/jpeg' ? '#fff' : 'transparent',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    }

    // Unit Conversion Logic
    if (settings.customWidth && settings.customHeight) {
        let w = parseFloat(settings.customWidth)
        let h = parseFloat(settings.customHeight)
        let dpi = settings.dpi || 300

        // Convert everything to Pixels for the canvas
        if (settings.unit === 'in') {
            w = w * dpi
            h = h * dpi
        } else if (settings.unit === 'cm') {
            w = (w * dpi) / 2.54
            h = (h * dpi) / 2.54
        } else if (settings.unit === 'mm') {
            w = (w * dpi) / 25.4
            h = (h * dpi) / 25.4
        }

        options.width = Math.round(w)
        options.height = Math.round(h)
    }

    const canvas = cropper.getCroppedCanvas(options)
    if (!canvas) return

    // Post-Processing (Filters)
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = canvas.width
    finalCanvas.height = canvas.height
    const ctx = finalCanvas.getContext('2d')

    ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`
    ctx.drawImage(canvas, 0, 0)

    // Circular Crop
    if (settings.isRound) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.drawImage(finalCanvas, 0, 0)
      
      ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height)
      ctx.save()
      ctx.beginPath()
      ctx.arc(finalCanvas.width/2, finalCanvas.height/2, Math.min(finalCanvas.width, finalCanvas.height)/2, 0, 2*Math.PI)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(tempCanvas, 0, 0)
      ctx.restore()
    }

    const imageUrl = finalCanvas.toDataURL(settings.format, settings.quality)
    const link = document.createElement('a')
    link.download = `cropyfier-${settings.isRound ? 'circle' : 'edit'}.${settings.format === 'image/png' ? 'png' : settings.format.split('/')[1]}`
    link.href = imageUrl
    link.click()
  }

  // Actions passed to Sidebar
  const actions = {
    setMode: (mode) => {
      cropperRef.current?.cropper?.setDragMode(mode)
      setSettings(s => ({ ...s, dragMode: mode }))
    },
    setPresetRatio: (ratio) => {
      setSettings(s => ({ ...s, isRound: false, customWidth: '', customHeight: '' }))
      cropperRef.current?.cropper?.setAspectRatio(ratio)
    },
    toggleRound: () => {
      const newState = !settings.isRound
      setSettings(s => ({ ...s, isRound: newState }))
      if (newState) {
        cropperRef.current?.cropper?.setAspectRatio(1)
        setSettings(s => ({ ...s, isRound: true, customWidth: '', customHeight: '' }))
      } else {
        cropperRef.current?.cropper?.setAspectRatio(NaN)
      }
    },
    handleCustomSize: (val, type) => {
       let newSettings = { ...settings }
       if (type === 'w') newSettings.customWidth = val
       if (type === 'h') newSettings.customHeight = val
       setSettings(newSettings)
       // Update ratio if both exist and we are in pixels (conversions are complex to preview live)
       if (newSettings.unit === 'px' && newSettings.customWidth && newSettings.customHeight) {
         cropperRef.current?.cropper?.setAspectRatio(newSettings.customWidth / newSettings.customHeight)
       }
    },
    handleUnitChange: (newUnit) => {
        setSettings(s => ({...s, unit: newUnit}))
    },
    rotate: (deg) => {
      cropperRef.current?.cropper?.rotate(deg)
      setSettings(s => ({ ...s, rotation: s.rotation + deg }))
    },
    flipHorizontal: () => {
      const newScale = settings.scaleX === 1 ? -1 : 1
      cropperRef.current?.cropper?.scaleX(newScale)
      setSettings(s => ({ ...s, scaleX: newScale }))
    },
    flipVertical: () => {
      const newScale = settings.scaleY === 1 ? -1 : 1
      cropperRef.current?.cropper?.scaleY(newScale)
      setSettings(s => ({ ...s, scaleY: newScale }))
    },
    resetFilters: () => {
      setSettings(s => ({ ...s, brightness: 100, contrast: 100, saturation: 100 }))
    },
    download: getCropData,
    cancel: () => setImage(null)
  }

  return (
    <div className="h-screen w-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden">
      
      {settings.isRound && (
        <style>{`
          .cropper-view-box, .cropper-face {
            border-radius: 50% !important;
            outline: 0 !important;
          }
        `}</style>
      )}

      <div className="px-6 pt-2 flex-shrink-0 z-20">
        <Header version="v2.3 Final" />
      </div>

      <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 h-full overflow-hidden flex flex-col lg:flex-row gap-6">
        {!image ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            {/* Canvas Area (LEFT) */}
            <div className="flex-1 bg-black/20 p-4 rounded-2xl border border-gray-800/50 flex items-center justify-center relative overflow-hidden">
               <div style={{ 
                 filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`,
                 width: '100%', height: '100%'
                }}>
                <Cropper
                    ref={cropperRef}
                    style={{ height: "100%", width: "100%" }}
                    initialAspectRatio={NaN}
                    src={image}
                    viewMode={1}
                    guides={true}
                    background={false}
                    responsive={true}
                    autoCropArea={1}
                    checkOrientation={false}
                    dragMode={settings.dragMode}
                />
              </div>
            </div>

            {/* Sidebar Area (RIGHT) - Fixed Width 420px */}
            <div className="w-full lg:w-[420px] h-full flex-shrink-0 z-10">
                <Sidebar settings={settings} setSettings={setSettings} actions={actions} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App