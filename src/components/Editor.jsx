// src/components/Editor.jsx
import { useEffect, useRef, useState } from "react";
import Cropper from "cropperjs"; 
import "cropperjs/dist/cropper.css";
import { generateCanvas } from "../utils/canvasUtils";

export default function Editor({ image, settings, setSettings, isPicking, setIsPicking, actions }) {
  const imageElementRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const wrapperRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  
  const isRoundRef = useRef(settings.isRound);
  useEffect(() => { isRoundRef.current = settings.isRound; }, [settings.isRound]);

  // Sync ref for external actions (download/save)
  useEffect(() => {
    actions.registerCropper(cropperInstanceRef);
  }, [actions]);

  // --- PREVIEW GENERATOR ---
  useEffect(() => {
    // Only generate preview if specific features are active
    const needsPreview = settings.removeColorActive || settings.watermarkText || isPicking;
    
    if (!needsPreview || !image) {
      setPreviewImage(null);
      return;
    }

    setIsProcessing(true);
    // Debounce to prevent lag
    const timer = setTimeout(() => {
       const canvas = generateCanvas(cropperInstanceRef.current, settings);
       if (canvas) {
         setPreviewImage(canvas.toDataURL());
       }
       setIsProcessing(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [
    settings, // Depends on all settings
    image,
    isPicking
  ]);

  // --- CROPPER INITIALIZATION ---
  useEffect(() => {
    if (image && imageElementRef.current) {
      if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();

      const cropper = new Cropper(imageElementRef.current, {
        viewMode: 1,
        dragMode: 'move', // Default
        initialAspectRatio: NaN,
        guides: true,
        center: true,
        background: false, // Important for visual cleanliness
        autoCropArea: 0.8,
        responsive: true,
        checkOrientation: false,
        autoCrop: true,
        toggleDragModeOnDblclick: false,
      });

      cropperInstanceRef.current = cropper;
    }
    return () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      }
    };
  }, [image]);

  // --- INTERACTION MODE HANDLING ---
  useEffect(() => {
    const cropper = cropperInstanceRef.current;
    if (!cropper) return;

    // 1. Color Picking Mode
    if (isPicking) {
        cropper.setDragMode('none');
        document.body.style.cursor = 'crosshair';
        cropper.clear(); // Hide crop box to see image clearly
    } 
    // 2. Manual Watermark Positioning Mode
    else if (settings.watermarkText && typeof settings.watermarkPos === 'object') {
        cropper.setDragMode('none');
        document.body.style.cursor = 'move';
        cropper.clear(); // Hide crop box
    }
    // 3. Standard Mode
    else {
        cropper.setDragMode(settings.dragMode);
        document.body.style.cursor = 'default';
        cropper.crop(); // Restore crop box
    }
  }, [isPicking, settings.dragMode, settings.watermarkText, settings.watermarkPos]);


  // --- CLICK/TOUCH HANDLER FOR CANVAS ---
  const handleCanvasInteraction = (e) => {
    if (!cropperInstanceRef.current) return;

    // A. Handle Color Picker
    if (isPicking) {
        if (window.EyeDropper) {
           const eyeDropper = new EyeDropper();
           eyeDropper.open().then((result) => {
              setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true }));
              setIsPicking(false);
           }).catch(() => { setIsPicking(false); });
        } else {
           alert("Use the color input in the sidebar.");
           setIsPicking(false);
        }
        return;
    }

    // B. Handle Manual Watermark Placement
    if (settings.watermarkText && typeof settings.watermarkPos === 'object') {
        // Get Click Coordinates relative to the displayed canvas (image)
        const cropper = cropperInstanceRef.current;
        const canvasData = cropper.getCanvasData();
        const cropBoxData = cropper.getCropBoxData();
        
        const rect = wrapperRef.current.getBoundingClientRect();
        
        // Mouse/Touch Client Coordinates
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        // Calculate offset inside the wrapper
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        // Map Wrapper offset to Image offset
        // canvasData.left/top is where the image starts inside the wrapper
        const imageX = offsetX - canvasData.left;
        const imageY = offsetY - canvasData.top;

        // Convert to percentage (0 to 1)
        const percentX = imageX / canvasData.width;
        const percentY = imageY / canvasData.height;

        // Clamp values
        const finalX = Math.max(0, Math.min(1, percentX));
        const finalY = Math.max(0, Math.min(1, percentY));

        setSettings(s => ({ ...s, watermarkPos: { x: finalX, y: finalY } }));
    }
  };

  const isPreviewActive = (settings.removeColorActive || settings.watermarkText) && !isPicking;
  
  // Calculate display filter for the base image (only if preview NOT active)
  const displayFilter = isPreviewActive ? 'none' : 
    `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;

  return (
    <div className="flex-1 bg-[#0B0F19] relative flex items-center justify-center overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Compare Button */}
        {(isPreviewActive || isComparing) && (
            <div className="absolute top-4 right-4 z-50">
            <button
                onMouseDown={() => setIsComparing(true)}
                onMouseUp={() => setIsComparing(false)}
                onMouseLeave={() => setIsComparing(false)}
                onTouchStart={() => setIsComparing(true)}
                onTouchEnd={() => setIsComparing(false)}
                className="bg-gray-800/80 backdrop-blur border border-gray-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-gray-700 active:scale-95 transition select-none"
            >
                Hold to Compare
            </button>
            </div>
        )}

        {/* Info Bars */}
        {isPicking && (
            <div className="absolute top-0 left-0 w-full bg-blue-600 text-white text-center text-xs font-bold py-2 z-50 animate-fade-in">
            Mode Active: Click on the image to select the color to remove.
            </div>
        )}
        {settings.watermarkText && typeof settings.watermarkPos === 'object' && (
             <div className="absolute top-0 left-0 w-full bg-blue-600 text-white text-center text-xs font-bold py-2 z-50 animate-fade-in">
             Mode Active: Tap/Click anywhere on the image to place text.
             </div>
        )}

        <div 
            ref={wrapperRef}
            className="relative z-10 w-full h-full flex items-center justify-center p-4"
            onClick={handleCanvasInteraction}
        >
        
        {/* 1. ORIGINAL CROPPER */}
        <div style={{ 
            display: isPreviewActive ? 'none' : 'block',
            filter: displayFilter, width: '100%', height: '100%' 
        }}>
            <img ref={imageElementRef} src={image} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} alt="Edit Target" />
        </div>

        {/* 2. PROCESSED PREVIEW OVERLAY */}
        {isPreviewActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0B0F19] z-20 pointer-events-none">
                {/* Checkboard pattern for transparency */}
                <div className="bg-[url('https://border-radius.com/img/transparent.png')] bg-repeat w-full h-full absolute opacity-20 z-0"></div>
                
                {previewImage ? (
                <img 
                    src={isComparing ? image : previewImage} 
                    className="relative z-10 max-w-full max-h-full object-contain shadow-2xl" 
                    style={isComparing ? {} : {}}
                    alt="Preview"
                />
                ) : (
                <div className="flex flex-col items-center gap-2 relative z-30">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400">Rendering...</span>
                </div>
                )}
            </div>
        )}
        </div>
    </div>
  );
}