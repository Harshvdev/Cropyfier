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
    const protectionCanvasRef = useRef(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const lastPosRef = useRef({ x: 0, y: 0 }); 

    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComparing, setIsComparing] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    const generationRef = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        actions.registerCropper(cropperInstanceRef);
        actions.registerProtection(protectionCanvasRef);
    }, [actions]);

    const filterString = getFilterString(settings);
    const isComplexMode = settings.removeColorActive || settings.watermarkText;
    const isBrushActive = settings.brushActive;

    // --- PREVIEW GENERATOR ---
    const generatePreview = useCallback(() => {
        if (!isComplexMode || !image || isInteracting) return;

        setIsProcessing(true);
        const genId = ++generationRef.current;

        setTimeout(() => {
            if (genId !== generationRef.current) return;
            const cropper = cropperInstanceRef.current;
            if (!cropper || !cropper.canvas) return;

            const canvas = generateCanvas(cropper, settings, protectionCanvasRef.current);

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
                }, 'image/png');
            } else {
                if (genId === generationRef.current) setIsProcessing(false);
            }
        }, 50);

    }, [settings, image, isInteracting, isComplexMode]);

    useEffect(() => {
        generatePreview();
        return () => {
            setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        };
    }, [generatePreview]);

    // --- DRAWING LOGIC ---
    const getPointerPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const handlePointerDown = (e) => {
        if (!isBrushActive) return;
        e.preventDefault(); e.stopPropagation();
        const canvas = protectionCanvasRef.current;
        if (!canvas) return;
        
        const isEraser = e.altKey || settings.isEraser;
        if (e.altKey && !settings.isEraser) setSettings(prev => ({ ...prev, isEraser: true }));

        setIsDrawing(true);
        e.target.setPointerCapture(e.pointerId);
        const pos = getPointerPos(e, canvas);
        lastPosRef.current = pos;
        paintLine(pos, pos, isEraser);
    };

    const handlePointerMove = (e) => {
        if (!isBrushActive || !isDrawing) return;
        e.preventDefault();
        const canvas = protectionCanvasRef.current;
        if (!canvas) return;
        const currentPos = getPointerPos(e, canvas);
        paintLine(lastPosRef.current, currentPos, settings.isEraser);
        lastPosRef.current = currentPos;
    };

    const handlePointerUp = (e) => {
        setIsDrawing(false);
        if (e.altKey && settings.isEraser) setSettings(prev => ({ ...prev, isEraser: false }));
        if (isBrushActive) { e.target.releasePointerCapture(e.pointerId); generatePreview(); }
    };

    const paintLine = (start, end, isEraser = false) => {
        const canvas = protectionCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0) return;
        const scaleX = canvas.width / rect.width;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const baseSize = settings.brushSize || 50;
        ctx.lineWidth = baseSize * scaleX; 
        if (isEraser) { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,1)'; } 
        else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(0, 255, 0, 1.0)'; }
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    };

    // --- OVERLAY SYNC (FIXED ALIGNMENT) ---
    const syncOverlayPosition = useCallback(() => {
        const cropper = cropperInstanceRef.current;
        const overlay = overlayRef.current;
        const pCanvas = protectionCanvasRef.current;
        const wrapper = wrapperRef.current;

        if (!cropper || !overlay || !wrapper || !pCanvas) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            if (!cropper.cropper || !cropper.canvas) return;
            const cropBoxData = cropper.getCropBoxData();
            const canvasData = cropper.getCanvasData();
            const imageData = cropper.getImageData();
            const container = wrapper.querySelector('.cropper-container');

            if (!container || cropBoxData.width === 0 || settings.selectedPreset === 'view') {
                overlay.style.display = 'none'; pCanvas.style.display = 'none'; return;
            }

            const wrapperRect = wrapper.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const wrapperStyle = window.getComputedStyle(wrapper);
            
            // Get wrapper border (to find absolute top/left origin inside border)
            const borderLeft = parseFloat(wrapperStyle.borderLeftWidth) || 0;
            const borderTop = parseFloat(wrapperStyle.borderTopWidth) || 0;
            
            // Origin of the absolute element (top-left of the padding box)
            const absoluteOriginX = wrapperRect.left + borderLeft;
            const absoluteOriginY = wrapperRect.top + borderTop;

            // Calculate precise visual offset relative to absolute origin
            const offsetX = containerRect.left - absoluteOriginX;
            const offsetY = containerRect.top - absoluteOriginY;

            const transform = `translate3d(${offsetX + cropBoxData.left}px, ${offsetY + cropBoxData.top}px, 0)`;
            const widthPx = `${cropBoxData.width}px`;
            const heightPx = `${cropBoxData.height}px`;

            const naturalScale = imageData.naturalWidth / canvasData.width; 
            const internalWidth = Math.round(cropBoxData.width * naturalScale);
            const internalHeight = Math.round(cropBoxData.height * naturalScale);

            overlay.style.width = widthPx; overlay.style.height = heightPx;
            overlay.style.transform = transform; overlay.style.borderRadius = settings.isRound ? '50%' : '0';

            if (pCanvas.width !== internalWidth || pCanvas.height !== internalHeight) {
                pCanvas.width = internalWidth; pCanvas.height = internalHeight;
            }
            pCanvas.style.width = widthPx; pCanvas.style.height = heightPx; pCanvas.style.transform = transform;

            const shouldShow = isComplexMode && previewUrl && !isComparing && !isInteracting;
            overlay.style.display = shouldShow ? 'block' : 'none';
            pCanvas.style.display = isBrushActive ? 'block' : 'none';
            pCanvas.style.zIndex = 50; pCanvas.style.pointerEvents = 'none'; 
        });
    }, [previewUrl, isComparing, isInteracting, settings.isRound, settings.selectedPreset, isComplexMode, isBrushActive]);

    useEffect(() => { syncOverlayPosition(); }, [syncOverlayPosition]);

    // --- CROPPER INIT ---
    useLayoutEffect(() => {
        if (image && imageElementRef.current) {
            if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();
            const cropper = new Cropper(imageElementRef.current, {
                viewMode: 1, dragMode: 'crop', zoomable: false, guides: true, background: false, autoCropArea: 0.8,
                ready: () => { if (settings.scaleX !== 1) cropper.scaleX(settings.scaleX); syncOverlayPosition(); generatePreview(); },
                crop: () => syncOverlayPosition(),
                cropstart: () => setIsInteracting(true),
                cropend: () => { setIsInteracting(false); setTimeout(generatePreview, 10); },
            });
            cropperInstanceRef.current = cropper;
        }
        return () => { if (cropperInstanceRef.current) cropperInstanceRef.current.destroy(); };
    }, [image]);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const observer = new ResizeObserver(() => {
            if (!wrapper.isConnected) return;
            const cropper = cropperInstanceRef.current;
            if (cropper && cropper.container) { try { cropper.resize(); syncOverlayPosition(); } catch (e) { } }
        });
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [syncOverlayPosition]);

    // Reset Crop UI
    useEffect(() => {
        const needsCropUI = activeTab === 'crop' || activeTab === 'watermark';
        if (!needsCropUI) {
             const cropper = cropperInstanceRef.current;
             if (cropper && cropper.canvas) {
                try {
                    const canvasData = cropper.getCanvasData();
                    const cropBoxData = cropper.getCropBoxData();
                    const isFullWidth = Math.abs(cropBoxData.width - canvasData.width) < 1;
                    const isFullHeight = Math.abs(cropBoxData.height - canvasData.height) < 1;
                    if (!isFullWidth || !isFullHeight) {
                        cropper.setCropBoxData({ left: canvasData.left, top: canvasData.top, width: canvasData.width, height: canvasData.height });
                        setTimeout(() => syncOverlayPosition(), 0);
                    }
                } catch(e) {}
             }
        }
    }, [activeTab, isBrushActive, syncOverlayPosition]);

    // Interaction UI
    useEffect(() => {
        const wrapper = wrapperRef.current;
        const cropper = cropperInstanceRef.current;
        if (!wrapper || !cropper) return;
        const needsCropUI = activeTab === 'crop' || activeTab === 'watermark';
        if (needsCropUI && !isBrushActive) { cropper.enable(); wrapper.classList.remove('cropper-disabled'); } 
        else { cropper.disable(); wrapper.classList.add('cropper-disabled'); }
        if (isComplexMode && !isComparing && !isInteracting) { wrapper.classList.add('complex-mode-active'); } 
        else { wrapper.classList.remove('complex-mode-active'); }

        let targetCursor = 'default';
        if (isBrushActive) targetCursor = 'crosshair';
        else if (isPicking) targetCursor = 'alias';
        else if (activeTab === 'watermark' && settings.watermarkText && typeof settings.watermarkPos === 'object') targetCursor = 'move';
        else if (activeTab === 'crop') targetCursor = 'crosshair';
        document.body.style.cursor = targetCursor;
    }, [activeTab, isBrushActive, isPicking, settings.dragMode, settings.watermarkText, settings.watermarkPos, isComparing, isComplexMode, isInteracting]);

    const handleWrapperClick = async (e) => {
        if (isBrushActive) return;
        if (activeTab === 'watermark' && settings.watermarkText && typeof settings.watermarkPos === 'object') {
            const cropper = cropperInstanceRef.current;
            if (!cropper) return;
            const cropBoxData = cropper.getCropBoxData();
            const container = wrapperRef.current.querySelector('.cropper-container');
            if (!container) return;
            const containerRect = container.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            const boxLeft = cropBoxData.left + containerRect.left;
            const boxTop = cropBoxData.top + containerRect.top;
            const percentX = Math.max(0, Math.min(1, (clientX - boxLeft) / cropBoxData.width));
            const percentY = Math.max(0, Math.min(1, (clientY - boxTop) / cropBoxData.height));
            setSettings(s => ({ ...s, watermarkPos: { x: percentX, y: percentY } }));
            return;
        }
        if (isPicking) {
            if (window.EyeDropper) {
                try {
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open();
                    setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true, showMaskPreview: true }));
                    setIsPicking(false);
                } catch (e) { setIsPicking(false); }
            } else { alert("Please manually select color hex."); setIsPicking(false); }
        }
    };

    return (
        <div ref={wrapperRef} onClick={handleWrapperClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0B0F19] touch-none">
            <style>{`
                img { -webkit-user-drag: none; user-select: none; }
                .cropper-view-box img, .cropper-canvas img { transition: filter 0.15s ease; filter: ${isComplexMode ? 'none' : filterString} !important; }
                .complex-mode-active .cropper-view-box img, .complex-mode-active .cropper-canvas img { opacity: 0 !important; }
                .cropper-disabled .cropper-drag-box, .cropper-disabled .cropper-crop-box { pointer-events: none !important; opacity: 0 !important; }
                .cropper-disabled .cropper-modal { opacity: 0 !important; }
                .cropper-disabled .cropper-view-box { outline: none !important; }
                .cropper-disabled .cropper-canvas { opacity: 1 !important; }
                .transparency-grid { background-color: #222; background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%); background-size: 20px 20px; }
            `}</style>
            <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            {isBrushActive && (
                <div className="absolute top-4 left-4 z-50 animate-fade-in pointer-events-none">
                    <div className="bg-green-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 border border-green-500/30">
                        {settings.isEraser || (typeof window !== 'undefined' && window.event && window.event.altKey) ? (<span>🧼 Eraser Active</span>) : (<span>🛡️ Shield Active (Hold Alt to Erase)</span>)}
                    </div>
                </div>
            )}
            <div className="w-full h-full">
                <img ref={imageElementRef} src={image} crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', opacity: 0 }} alt="Target" />
            </div>
            <canvas ref={protectionCanvasRef} className="absolute top-0 left-0 z-30 pointer-events-none" style={{ display: 'none' }} />
            <div ref={overlayRef} className="absolute top-0 left-0 z-20 pointer-events-none" style={{ top: 0, left: 0, display: 'none', borderRadius: settings.isRound ? '50%' : '0' }}>
                {isComplexMode && (<div className="absolute inset-0 transparency-grid opacity-50 z-0" style={{ borderRadius: settings.isRound ? '50%' : '0' }}></div>)}
                {previewUrl && (<img src={previewUrl} className="w-full h-full relative z-10" style={{ objectFit: 'fill', imageRendering: settings.interpolation === 'pixelated' ? 'pixelated' : 'auto', borderRadius: settings.isRound ? '50%' : '0' }} alt="Preview" />)}
            </div>
            {isComplexMode && isProcessing && !isInteracting && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
                </div>
            )}
        </div>
    );
}