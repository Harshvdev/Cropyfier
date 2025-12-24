// src/components/Editor.jsx
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import Cropper from "cropperjs"; 
import "cropperjs/dist/cropper.css";
import { generateCanvas, getFilterString } from "../utils/canvasUtils";

export default function Editor({ image, settings, setSettings, isPicking, setIsPicking, actions, activeTab }) {
  const imageElementRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const wrapperRef = useRef(null);
  const overlayRef = useRef(null); 
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const generationRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    actions.registerCropper(cropperInstanceRef);
  }, [actions]);

  // --- 1. DYNAMIC CSS FOR FILTERS (The Fix for filters not showing) ---
  const filterString = getFilterString(settings);
  
  // Logic: If Eraser/Watermark is active, we rely on the canvas Overlay (which has filters baked in).
  // If only simple Filters are active, we apply CSS to the Cropper directly for performance.
  const isComplexMode = settings.removeColorActive || settings.watermarkText;

  // --- 2. PREVIEW GENERATOR (For Eraser/Watermark) ---
  const generatePreview = useCallback(() => {
    if (!isComplexMode || !image || isInteracting) return;

    setIsProcessing(true);
    const genId = ++generationRef.current;

    // Small debounce
    setTimeout(() => {
       if (genId !== generationRef.current) return;
       const cropper = cropperInstanceRef.current;
       if (!cropper) return;

       const canvas = generateCanvas(cropper, settings);
       
       if (canvas) {
         canvas.toBlob((blob) => {
            if (genId !== generationRef.current) return;
            if (!blob) { setIsProcessing(false); return; }

            const newUrl = URL.createObjectURL(blob);
            setPreviewUrl(prevUrl => {
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return newUrl;
            });
            setIsProcessing(false);
         }, 'image/png'); // Always PNG for preview transparency
       } else {
         if (genId === generationRef.current) setIsProcessing(false);
       }
    }, 50); 
  }, [settings, image, isInteracting, isComplexMode]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);


  // --- 3. OVERLAY SYNC (Aligns Preview with Crop Box) ---
  const syncOverlayPosition = useCallback(() => {
    const cropper = cropperInstanceRef.current;
    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;

    if (!cropper || !overlay || !wrapper) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
        if (!cropper.cropper) return; 

        const cropBoxData = cropper.getCropBoxData();
        const container = wrapper.querySelector('.cropper-container');
        
        if (!container || cropBoxData.width === 0 || settings.selectedPreset === 'view') {
           overlay.style.display = 'none';
           return;
        }
        
        const wrapperRect = wrapper.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate offset of the cropper container within our wrapper
        const offsetX = containerRect.left - wrapperRect.left;
        const offsetY = containerRect.top - wrapperRect.top;

        overlay.style.width = `${cropBoxData.width}px`;
        overlay.style.height = `${cropBoxData.height}px`;
        overlay.style.transform = `translate3d(${cropBoxData.left + offsetX}px, ${cropBoxData.top + offsetY}px, 0)`;
        overlay.style.borderRadius = settings.isRound ? '50%' : '0';
        
        // Show overlay only if we are in complex mode (Eraser/Text) and not interacting
        const shouldShow = isComplexMode && previewUrl && !isComparing && !isInteracting;
        overlay.style.display = shouldShow ? 'block' : 'none';
    });
  }, [previewUrl, isComparing, isInteracting, settings.isRound, settings.selectedPreset, isComplexMode]);

  useEffect(() => {
    syncOverlayPosition();
  }, [syncOverlayPosition]);


  // --- 4. CROPPER LIFECYCLE ---
  useLayoutEffect(() => {
    if (image && imageElementRef.current) {
      if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();

      const cropper = new Cropper(imageElementRef.current, {
        viewMode: 1, 
        dragMode: 'crop', 
        zoomable: false,
        restore: false,
        guides: true,
        center: true,
        background: false, // We provide our own background
        autoCropArea: 0.8,
        responsive: true,
        checkOrientation: false,
        modal: true,
        ready: () => {
            // Apply initial rotation/flips if they exist in settings
            if (settings.scaleX !== 1) cropper.scaleX(settings.scaleX);
            if (settings.scaleY !== 1) cropper.scaleY(settings.scaleY);
            if (settings.rotation !== 0) cropper.rotate(settings.rotation);
            
            syncOverlayPosition();
            generatePreview();
            
            if (settings.selectedPreset === 'view') {
                cropper.clear();
                cropper.disable();
            }
        },
        crop: () => { syncOverlayPosition(); },
        cropstart: () => { setIsInteracting(true); },
        cropend: () => {
            setIsInteracting(false);
            // Re-generate preview after move
            setTimeout(() => generatePreview(), 10);
        },
        zoom: syncOverlayPosition,
      });

      cropperInstanceRef.current = cropper;
    }
    return () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [image]); 


  // --- 5. INTERACTIONS & EVENTS ---

  // Handle Resize of window
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => {
        if (cropperInstanceRef.current) {
            cropperInstanceRef.current.resize();
            syncOverlayPosition();
        }
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [syncOverlayPosition]);

  // Manage Class Names & Cursor
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    // Complex Mode: Hide original image inside cropper so Overlay takes precedence
    if (isComplexMode && !isComparing && !isInteracting) {
        wrapper.classList.add('complex-mode-active');
    } else {
        wrapper.classList.remove('complex-mode-active');
    }

    if (isPicking || settings.selectedPreset === 'view') {
        wrapper.classList.add('hide-grid');
    } else {
        wrapper.classList.remove('hide-grid');
    }

    let targetCursor = 'default';
    if (isPicking) targetCursor = 'crosshair';
    else if (settings.watermarkText && typeof settings.watermarkPos === 'object') targetCursor = 'move';
    else if (activeTab === 'crop' && settings.dragMode === 'crop') targetCursor = 'crosshair';
    
    document.body.style.cursor = targetCursor;

  }, [isPicking, settings.dragMode, settings.watermarkText, settings.watermarkPos, activeTab, isComparing, isComplexMode, isInteracting, settings.selectedPreset]);


  // --- 6. CLICK HANDLER (Color Picker Fallback) ---
  const handleWrapperClick = async (e) => {
      // 1. Watermark Position Logic
      if (settings.watermarkText && typeof settings.watermarkPos === 'object') {
        const cropper = cropperInstanceRef.current;
        if (!cropper) return;
        const cropBoxData = cropper.getCropBoxData();
        const container = wrapperRef.current.querySelector('.cropper-container');
        if(!container) return;
        
        const containerRect = container.getBoundingClientRect();
        // Calculate clicks relative to the CROP BOX, not the screen
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const boxLeft = cropBoxData.left + containerRect.left;
        const boxTop = cropBoxData.top + containerRect.top;
        
        const relativeX = clientX - boxLeft;
        const relativeY = clientY - boxTop;
        
        const percentX = Math.max(0, Math.min(1, relativeX / cropBoxData.width));
        const percentY = Math.max(0, Math.min(1, relativeY / cropBoxData.height));
        
        setSettings(s => ({ ...s, watermarkPos: { x: percentX, y: percentY } }));
        return;
      }

      // 2. Color Picker Logic
      if (!isPicking) return;

      if (window.EyeDropper) {
        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true }));
            setIsPicking(false);
        } catch (e) { setIsPicking(false); }
      } else {
        // Fallback: Get color from Cropper Canvas
        const cropper = cropperInstanceRef.current;
        if(cropper) {
            const canvas = cropper.getCroppedCanvas(); // Full size canvas of current crop
            if(!canvas) return;
            
            // We need to map the click coordinates on the *screen* to the coordinates on the *canvas*
            // This is complex because the canvas is scaled in the view.
            // Simplified approach: Re-render a tiny canvas around the click point is hard.
            // Easier: Just alert/notify user limitations, OR, disable picker.
            // BUT, let's try a clever trick:
            // The `cropper` object has coordinate conversion methods.
            
            const container = wrapperRef.current.querySelector('.cropper-container');
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Get canvas data (original image data)
            const canvasData = cropper.getCanvasData(); 
            // Calculate pixel offset relative to image top-left
            const pixelX = (x - canvasData.left) / canvasData.width * canvas.width; // Approximation
            const pixelY = (y - canvasData.top) / canvasData.height * canvas.height;
            
            // This is still inaccurate because we are looking at the *cropped* canvas context usually.
            // Let's rely on visual feedback:
            alert("Please use Chrome or Edge for the best Color Picker experience. On this browser, try manually entering the Hex code.");
            setIsPicking(false);
        }
      }
  };


  return (
    <div 
        ref={wrapperRef}
        onClick={handleWrapperClick}
        className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0B0F19]"
    >
        {/* INJECT DYNAMIC CSS FOR FILTERS */}
        <style>{`
            /* Apply filters to the internal cropper images when NOT in complex mode */
            .cropper-view-box img,
            .cropper-canvas img {
                transition: filter 0.15s ease;
                filter: ${isComplexMode ? 'none' : filterString} !important;
            }

            /* Complex Mode: Hide original images so Overlay is visible */
            .complex-mode-active .cropper-view-box img,
            .complex-mode-active .cropper-canvas img {
                opacity: 0 !important;
            }

            /* Hide Grid Lines in certain modes */
            .hide-grid .cropper-crop-box,
            .hide-grid .cropper-point,
            .hide-grid .cropper-line {
                opacity: 0 !important;
            }

            /* Transparency Grid Background */
            .transparency-grid {
                background-color: #222;
                background-image: linear-gradient(45deg, #333 25%, transparent 25%),
                                  linear-gradient(-45deg, #333 25%, transparent 25%),
                                  linear-gradient(45deg, transparent 75%, #333 75%),
                                  linear-gradient(-45deg, transparent 75%, #333 75%);
                background-size: 20px 20px;
                background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            }
        `}</style>

        {/* Background Grid */}
        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Compare Button */}
        {(isComplexMode || isComparing) && (
            <div className="absolute top-4 right-4 z-50">
            <button
                onPointerDown={() => setIsComparing(true)}
                onPointerUp={() => setIsComparing(false)}
                onPointerLeave={() => setIsComparing(false)}
                className="bg-gray-800/80 backdrop-blur border border-gray-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-gray-700 select-none"
            >
                Hold to Compare
            </button>
            </div>
        )}

        {/* Picker Notification */}
        {isPicking && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
                <div className="bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold px-6 py-2 rounded-full shadow-2xl flex items-center gap-2">
                   <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                   <span>Click color to remove</span>
                </div>
            </div>
        )}

        {/* Cropper Container */}
        <div className="w-full h-full">
            <img 
                ref={imageElementRef} 
                src={image} 
                crossOrigin="anonymous" 
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', opacity: 0 }} 
                alt="Target" 
            />
        </div>

        {/* Generated Preview Overlay (For Eraser/Watermark) */}
        <div 
            ref={overlayRef}
            className="absolute z-20 pointer-events-none" 
            style={{ 
                top: 0, left: 0, display: 'none', 
                borderRadius: settings.isRound ? '50%' : '0' 
            }} 
        >
            {/* Background for transparency */}
            {isComplexMode && (
                <div className="absolute inset-0 transparency-grid opacity-50 z-0" style={{ borderRadius: settings.isRound ? '50%' : '0' }}></div>
            )}
            
            {/* The Generated Image */}
            {previewUrl && (
                <img 
                    src={previewUrl} 
                    className="w-full h-full relative z-10" 
                    style={{ 
                        objectFit: 'fill', 
                        imageRendering: settings.interpolation === 'pixelated' ? 'pixelated' : 'auto',
                        borderRadius: settings.isRound ? '50%' : '0' 
                    }}
                    alt="Preview"
                />
            )}
        </div>
        
        {/* Loading Spinner */}
        {isComplexMode && isProcessing && !isInteracting && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        )}
    </div>
  );
}