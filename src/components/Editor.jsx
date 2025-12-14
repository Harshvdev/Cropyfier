// src/components/Editor.jsx
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import Cropper from "cropperjs"; 
import "cropperjs/dist/cropper.css";
import { generateCanvas } from "../utils/canvasUtils";

export default function Editor({ image, settings, setSettings, isPicking, setIsPicking, actions, activeTab }) {
  const imageElementRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const wrapperRef = useRef(null);
  const overlayRef = useRef(null); 
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  
  // Track if user is currently dragging/resizing to temporarily disable preview for performance
  const [isInteracting, setIsInteracting] = useState(false);

  const generationRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    actions.registerCropper(cropperInstanceRef);
  }, [actions]);

  // --- 1. DIRECT DOM SYNC ---
  // Syncs the absolute overlay div with the active CropperJS selection box
  const syncOverlayPosition = useCallback(() => {
    const cropper = cropperInstanceRef.current;
    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;

    if (!cropper || !overlay || !wrapper) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
        const cropBoxData = cropper.getCropBoxData();
        const container = wrapper.querySelector('.cropper-container');
        
        if (!container || cropBoxData.width === 0) return;
        
        // Calculate the offset of the cropper container relative to our wrapper
        const wrapperRect = wrapper.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const offsetX = containerRect.left - wrapperRect.left;
        const offsetY = containerRect.top - wrapperRect.top;

        // Apply geometry
        overlay.style.width = `${cropBoxData.width}px`;
        overlay.style.height = `${cropBoxData.height}px`;
        overlay.style.transform = `translate3d(${cropBoxData.left + offsetX}px, ${cropBoxData.top + offsetY}px, 0)`;
        
        // Only show if we have a URL and aren't comparing
        overlay.style.display = (previewUrl && !isComparing && !isInteracting) ? 'block' : 'none';
    });
  }, [previewUrl, isComparing, isInteracting]);

  // --- 2. PREVIEW GENERATOR ---
  const generatePreview = useCallback(() => {
    const needsPreview = settings.removeColorActive || settings.watermarkText || isPicking;
    
    if (!needsPreview || !image || isInteracting) {
      // Don't revoke immediately to prevent flashing, just hide via CSS logic
      return;
    }

    setIsProcessing(true);
    const genId = ++generationRef.current;

    // Debounce slightly to allow UI to settle
    setTimeout(() => {
       if (genId !== generationRef.current) return;
       const cropper = cropperInstanceRef.current;
       if (!cropper) return;

       // Important: Canvas generation is heavy. 
       // We only generate what is currently inside the crop box.
       const canvas = generateCanvas(cropper, settings);
       
       if (canvas) {
         const hasTransparency = settings.removeColorActive || settings.format === 'image/png';
         const mimeType = hasTransparency ? 'image/png' : 'image/jpeg';
         
         canvas.toBlob((blob) => {
            if (genId !== generationRef.current) return;
            if (!blob) { setIsProcessing(false); return; }

            const newUrl = URL.createObjectURL(blob);
            setPreviewUrl(prevUrl => {
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return newUrl;
            });
            setIsProcessing(false);
         }, mimeType, 0.95);
       } else {
         if (genId === generationRef.current) setIsProcessing(false);
       }
    }, 50); 
  }, [settings, image, isInteracting, isPicking]);

  // Trigger generation on settings change
  useEffect(() => {
    generatePreview();
  }, [generatePreview]); // generatePreview depends on settings

  // Also trigger sync when previewUrl changes
  useEffect(() => {
    syncOverlayPosition();
  }, [previewUrl, syncOverlayPosition]);


  // --- 3. CROPPER LIFECYCLE ---
  useLayoutEffect(() => {
    if (image && imageElementRef.current) {
      if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();

      const cropper = new Cropper(imageElementRef.current, {
        viewMode: 1, // Restrict crop box to not exceed canvas
        dragMode: 'move',
        initialAspectRatio: NaN,
        guides: true,
        center: true,
        background: false, // We handle background grid manually
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
        checkOrientation: false,
        autoCrop: true,
        modal: true,
        toggleDragModeOnDblclick: false,
        
        ready: () => {
            syncOverlayPosition();
            // Initial generation
            generatePreview();
        },
        crop: () => {
            // Continually sync position during drag, even if content is hidden
            syncOverlayPosition();
        },
        // HIDE PREVIEW during interaction to prevent "sliding image" lag
        cropstart: () => {
            setIsInteracting(true);
        },
        // SHOW PREVIEW and REGENERATE when interaction stops
        cropend: () => {
            setIsInteracting(false);
            // We need a slight delay to let Cropper update its internal data
            setTimeout(() => {
                generatePreview();
            }, 10);
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
      document.body.style.cursor = 'default';
    };
  }, [image]); // Only re-init if image source changes

  // Handle Window Resize
  useEffect(() => {
      const handleResize = () => {
          if (cropperInstanceRef.current) syncOverlayPosition();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [syncOverlayPosition]);


  // --- 4. INTERACTIONS & EVENTS ---
  const isPreviewActive = (settings.removeColorActive || settings.watermarkText) && !isPicking;

  // Manage UI Classes for Hiding/Showing Original
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const cropper = cropperInstanceRef.current;
    
    // Logic: Hide original image inside crop box ONLY if:
    // 1. Preview mode is active
    // 2. We aren't holding "Compare"
    // 3. We aren't currently dragging the box (Interacting)
    const shouldHideOriginal = isPreviewActive && !isComparing && !isInteracting;

    if (shouldHideOriginal) {
        wrapper.classList.add('preview-active');
    } else {
        wrapper.classList.remove('preview-active');
    }

    // Cursor Logic
    let targetCursor = 'default';
    if (isPicking) {
        if(cropper) cropper.setDragMode('none');
        targetCursor = 'crosshair';
    } else if (settings.watermarkText && typeof settings.watermarkPos === 'object') {
        if(cropper) cropper.setDragMode('none');
        targetCursor = 'move';
    } else {
        if(cropper) cropper.setDragMode(activeTab === 'crop' ? settings.dragMode : 'move');
        targetCursor = activeTab === 'crop' && settings.dragMode === 'crop' ? 'crosshair' : 'default';
    }
    document.body.style.cursor = targetCursor;

  }, [isPicking, settings.dragMode, settings.watermarkText, settings.watermarkPos, settings.removeColorActive, activeTab, isComparing, isPreviewActive, isInteracting]);


  const handleCanvasInteraction = (e) => {
    if (!cropperInstanceRef.current) return;

    // A. Color Picker
    if (isPicking) {
        if (window.EyeDropper) {
           const eyeDropper = new EyeDropper();
           eyeDropper.open().then((result) => {
              setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true }));
              setIsPicking(false);
           }).catch(() => { setIsPicking(false); });
        } else {
           alert("Your browser does not support the EyeDropper API. Use Chrome or Edge, or enter Hex manually.");
           setIsPicking(false);
        }
        return;
    }

    // B. Manual Watermark Placement
    if (settings.watermarkText && typeof settings.watermarkPos === 'object') {
        const cropper = cropperInstanceRef.current;
        const cropBoxData = cropper.getCropBoxData();
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const container = wrapperRef.current.querySelector('.cropper-container');
        if(!container) return;
        const containerRect = container.getBoundingClientRect();
        
        const mouseXInContainer = clientX - containerRect.left;
        const mouseYInContainer = clientY - containerRect.top;

        // Calculate relative to the Crop Box
        const relativeX = mouseXInContainer - cropBoxData.left;
        const relativeY = mouseYInContainer - cropBoxData.top;

        // Convert to percentage (0-1)
        const percentX = Math.max(0, Math.min(1, relativeX / cropBoxData.width));
        const percentY = Math.max(0, Math.min(1, relativeY / cropBoxData.height));

        setSettings(s => ({ ...s, watermarkPos: { x: percentX, y: percentY } }));
    }
  };

  const baseFilter = isPreviewActive && !isInteracting && !isComparing ? 'none' : 
    `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;

  return (
    <div className="flex-1 bg-[#0B0F19] relative flex items-center justify-center overflow-hidden">
        <style>{`
            /* CSS GRID PATTERN for Transparency */
            .transparency-grid {
                background-color: #eee;
                background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
                                  linear-gradient(-45deg, #ccc 25%, transparent 25%),
                                  linear-gradient(45deg, transparent 75%, #ccc 75%),
                                  linear-gradient(-45deg, transparent 75%, #ccc 75%);
                background-size: 20px 20px;
                background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            }
            .dark .transparency-grid {
                background-color: #222;
                background-image: linear-gradient(45deg, #333 25%, transparent 25%),
                                  linear-gradient(-45deg, #333 25%, transparent 25%),
                                  linear-gradient(45deg, transparent 75%, #333 75%),
                                  linear-gradient(-45deg, transparent 75%, #333 75%);
            }

            /* UI Visibility Helpers */
            .hide-crop-ui .cropper-crop-box,
            .hide-crop-ui .cropper-modal {
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.2s ease;
            }
            .hide-crop-ui .cropper-view-box { outline: none !important; }
            
            /* FORCE HIDE ORIGINAL IMAGE IN PREVIEW MODE */
            /* We hide the image inside the view-box to prevent "Double Image" ghosting */
            .preview-active .cropper-view-box img {
                opacity: 0 !important;
                visibility: hidden !important; 
            }
            /* Hide cropper internal grid lines in preview for cleaner look */
            .preview-active .cropper-point,
            .preview-active .cropper-line,
            .preview-active .cropper-dashed {
                opacity: 0.3 !important; /* Keep faint for guidance */
            }
        `}</style>

        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {(isPreviewActive || isComparing) && (
            <div className="absolute top-4 right-4 z-50">
            <button
                onPointerDown={() => setIsComparing(true)}
                onPointerUp={() => setIsComparing(false)}
                onPointerLeave={() => setIsComparing(false)}
                className="bg-gray-800/80 backdrop-blur border border-gray-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-gray-700 active:scale-95 transition select-none"
            >
                Hold to Compare
            </button>
            </div>
        )}

        {isPicking && (
            <div className="absolute top-0 left-0 w-full bg-blue-600 text-white text-center text-xs font-bold py-2 z-50 animate-fade-in">
            Mode Active: Click to pick color (System Picker)
            </div>
        )}
        {settings.watermarkText && typeof settings.watermarkPos === 'object' && (
             <div className="absolute top-0 left-0 w-full bg-blue-600 text-white text-center text-xs font-bold py-2 z-50 animate-fade-in">
             Mode Active: Tap on image to position text
             </div>
        )}

        <div 
            ref={wrapperRef}
            className="relative z-10 w-full h-full flex items-center justify-center p-4"
            onClick={handleCanvasInteraction}
        >
            {/* 1. ORIGINAL CROPPER */}
            <div style={{ width: '100%', height: '100%', filter: baseFilter }}>
                <img 
                    ref={imageElementRef} 
                    src={image} 
                    crossOrigin="anonymous" 
                    style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} 
                    alt="Target" 
                />
            </div>

            {/* 2. PREVIEW OVERLAY */}
            <div 
                ref={overlayRef}
                className="absolute z-20 pointer-events-none" 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    display: 'none', 
                    willChange: 'transform, width, height'
                }} 
            >
                 {/* Transparency Grid */}
                 {(settings.removeColorActive || settings.format !== 'image/jpeg') && (
                     <div className="absolute inset-0 transparency-grid opacity-50 z-0"></div>
                 )}

                {previewUrl && !isComparing && !isInteracting && (
                    <img 
                        src={previewUrl} 
                        className="w-full h-full relative z-10 shadow-lg" 
                        style={{ 
                            objectFit: 'fill', 
                            imageRendering: settings.interpolation === 'pixelated' ? 'pixelated' : 'auto'
                        }}
                        alt="Preview"
                    />
                )}
            </div>
            
            {/* Loading Spinner - centered in the wrapper, but only shown when processing */}
            {isPreviewActive && isProcessing && !isInteracting && (
                 <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                 </div>
            )}
        </div>
    </div>
  );
}