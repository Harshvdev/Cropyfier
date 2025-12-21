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
  const [isInteracting, setIsInteracting] = useState(false);

  const generationRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    actions.registerCropper(cropperInstanceRef);
  }, [actions]);

  // --- 1. DIRECT DOM SYNC ---
  const syncOverlayPosition = useCallback(() => {
    const cropper = cropperInstanceRef.current;
    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;

    if (!cropper || !overlay || !wrapper) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
        // Safety check: if cropper was destroyed mid-frame
        if (!cropper.cropper) return;

        const cropBoxData = cropper.getCropBoxData();
        const container = wrapper.querySelector('.cropper-container');
        
        if (!container || cropBoxData.width === 0) return;
        
        const wrapperRect = wrapper.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const offsetX = containerRect.left - wrapperRect.left;
        const offsetY = containerRect.top - wrapperRect.top;

        overlay.style.width = `${cropBoxData.width}px`;
        overlay.style.height = `${cropBoxData.height}px`;
        overlay.style.transform = `translate3d(${cropBoxData.left + offsetX}px, ${cropBoxData.top + offsetY}px, 0)`;
        
        overlay.style.borderRadius = settings.isRound ? '50%' : '0';
        
        overlay.style.display = (previewUrl && !isComparing && !isInteracting) ? 'block' : 'none';
    });
  }, [previewUrl, isComparing, isInteracting, settings.isRound]);

  // --- 2. PREVIEW GENERATOR ---
  const generatePreview = useCallback(() => {
    const needsPreview = settings.removeColorActive || settings.watermarkText || isPicking;
    
    if (!needsPreview || !image || isInteracting) {
      return;
    }

    setIsProcessing(true);
    const genId = ++generationRef.current;

    setTimeout(() => {
       if (genId !== generationRef.current) return;
       const cropper = cropperInstanceRef.current;
       if (!cropper) return;

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

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  useEffect(() => {
    syncOverlayPosition();
  }, [previewUrl, syncOverlayPosition]);


  // --- 3. CROPPER LIFECYCLE ---
  useLayoutEffect(() => {
    if (image && imageElementRef.current) {
      if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();

      const cropper = new Cropper(imageElementRef.current, {
        viewMode: 1, 
        dragMode: 'crop', 
        
        zoomable: false,
        zoomOnTouch: false,
        zoomOnWheel: false,
        movable: false, 
        scalable: false,

        initialAspectRatio: NaN,
        guides: true,
        center: true,
        background: false,
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
        checkOrientation: false,
        autoCrop: true,
        modal: true,
        toggleDragModeOnDblclick: false,
        
        ready: () => {
            syncOverlayPosition();
            generatePreview();
        },
        crop: () => {
            syncOverlayPosition();
        },
        cropstart: () => {
            setIsInteracting(true);
        },
        cropend: () => {
            setIsInteracting(false);
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
  }, [image]); 

  // --- NEW: RESIZE OBSERVER (FIXED FOR CRASH) ---
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const resizeObserver = new ResizeObserver(() => {
        // Safety Check 1: Is wrapper still in DOM?
        if (!wrapper.isConnected) return;

        // Safety Check 2: Does cropper instance exist?
        const cropper = cropperInstanceRef.current;
        if (cropper) {
            // Safety Check 3: Does cropper have a valid container?
            // CropperJS throws "undefined reading offsetWidth" if container is missing
            const container = wrapper.querySelector('.cropper-container');
            if (container) {
                // Wrap in requestAnimationFrame to avoid ResizeObserver loop limit exceeded
                requestAnimationFrame(() => {
                    try {
                        cropper.resize();
                        syncOverlayPosition();
                    } catch (e) {
                        // Silent catch if cropper is destroyed mid-resize
                    }
                });
            }
        }
    });

    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, [syncOverlayPosition]);


  // --- 4. INTERACTIONS & EVENTS ---
  const isPreviewActive = (settings.removeColorActive || settings.watermarkText) && !isPicking;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const cropper = cropperInstanceRef.current;
    
    const shouldHideOriginal = isPreviewActive && !isComparing && !isInteracting;

    if (shouldHideOriginal) {
        wrapper.classList.add('preview-active');
    } else {
        wrapper.classList.remove('preview-active');
    }

    let targetCursor = 'default';
    if (isPicking) {
        if(cropper) cropper.setDragMode('none');
        targetCursor = 'crosshair';
    } else if (settings.watermarkText && typeof settings.watermarkPos === 'object') {
        if(cropper) cropper.setDragMode('none');
        targetCursor = 'move';
    } else {
        if (cropper) {
            const mode = activeTab === 'crop' && settings.dragMode === 'crop' ? 'crop' : 'none';
            cropper.setDragMode(mode);
        }
        targetCursor = activeTab === 'crop' && settings.dragMode === 'crop' ? 'crosshair' : 'default';
    }
    document.body.style.cursor = targetCursor;

  }, [isPicking, settings.dragMode, settings.watermarkText, settings.watermarkPos, settings.removeColorActive, activeTab, isComparing, isPreviewActive, isInteracting]);


  const handleCanvasInteraction = (e) => {
    if (!cropperInstanceRef.current) return;
    // ... (rest of interaction logic remains same)
    if (isPicking) {
        if (window.EyeDropper) {
           const eyeDropper = new EyeDropper();
           eyeDropper.open().then((result) => {
              setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true }));
              setIsPicking(false);
           }).catch(() => { setIsPicking(false); });
        } else {
           alert("Use Chrome or Edge for Color Picker.");
           setIsPicking(false);
        }
        return;
    }
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
        const relativeX = mouseXInContainer - cropBoxData.left;
        const relativeY = mouseYInContainer - cropBoxData.top;
        const percentX = Math.max(0, Math.min(1, relativeX / cropBoxData.width));
        const percentY = Math.max(0, Math.min(1, relativeY / cropBoxData.height));
        setSettings(s => ({ ...s, watermarkPos: { x: percentX, y: percentY } }));
    }
  };

  const baseFilter = isPreviewActive && !isInteracting && !isComparing ? 'none' : 
    `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;

  return (
    <div 
        ref={wrapperRef}
        className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0B0F19]"
    >
        {/* ... (styles remain the same) */}
        <style>{`
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
            .hide-crop-ui .cropper-crop-box,
            .hide-crop-ui .cropper-modal {
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.2s ease;
            }
            .hide-crop-ui .cropper-view-box { outline: none !important; }
            
            .preview-active .cropper-view-box img {
                opacity: 0 !important;
                visibility: hidden !important; 
            }
            .preview-active .cropper-point,
            .preview-active .cropper-line,
            .preview-active .cropper-dashed {
                opacity: 0.3 !important;
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

        {/* CROPPER CANVAS */}
        <div style={{ width: '100%', height: '100%', filter: baseFilter }}>
            <img 
                ref={imageElementRef} 
                src={image} 
                crossOrigin="anonymous" 
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} 
                alt="Target" 
            />
        </div>

        <div 
            ref={overlayRef}
            className="absolute z-20 pointer-events-none" 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                display: 'none', 
                willChange: 'transform, width, height',
                borderRadius: settings.isRound ? '50%' : '0' 
            }} 
        >
                {(settings.removeColorActive || settings.format !== 'image/jpeg') && (
                    <div 
                    className="absolute inset-0 transparency-grid opacity-50 z-0"
                    style={{ borderRadius: settings.isRound ? '50%' : '0' }}
                ></div>
                )}

            {previewUrl && !isComparing && !isInteracting && (
                <img 
                    src={previewUrl} 
                    className="w-full h-full relative z-10 shadow-lg" 
                    style={{ 
                        objectFit: 'fill', 
                        imageRendering: settings.interpolation === 'pixelated' ? 'pixelated' : 'auto',
                        borderRadius: settings.isRound ? '50%' : '0' 
                    }}
                    alt="Preview"
                />
            )}
        </div>
        
        {isPreviewActive && isProcessing && !isInteracting && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                </div>
        )}
    </div>
  );
}