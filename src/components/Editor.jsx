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
    const prevSettingsRef = useRef(null);
    const lastMoveUpdateRef = useRef(0);

    useEffect(() => {
        actions.registerCropper(cropperInstanceRef);
        actions.registerProtection(protectionCanvasRef);
    }, [actions]);

    const filterString = getFilterString(settings);
    const isComplexMode = settings.removeColorActive || settings.watermarkText || settings.gridSplitActive;
    const isBrushActive = settings.brushActive;

    // --- PREVIEW GENERATOR ---
    const generatePreview = useCallback(() => {
        if (!isComplexMode || !image || isInteracting) return;

        const prev = prevSettingsRef.current;
        prevSettingsRef.current = settings;

        if (prev) {
            const canvasSettingsChanged =
                settings.brightness !== prev.brightness ||
                settings.contrast !== prev.contrast ||
                settings.saturation !== prev.saturation ||
                settings.grayscale !== prev.grayscale ||
                settings.sepia !== prev.sepia ||
                settings.invert !== prev.invert ||
                settings.hue !== prev.hue ||
                settings.blur !== prev.blur ||
                settings.removeColorActive !== prev.removeColorActive ||
                settings.removeColorHex !== prev.removeColorHex ||
                settings.removeTolerance !== prev.removeTolerance ||
                settings.removeErosion !== prev.removeErosion ||
                settings.removeContiguousOnly !== prev.removeContiguousOnly ||
                settings.removeGridActive !== prev.removeGridActive ||
                settings.removeGridRows !== prev.removeGridRows ||
                settings.removeGridCols !== prev.removeGridCols ||
                settings.showMaskPreview !== prev.showMaskPreview ||
                settings.brushActive !== prev.brushActive ||
                settings.brushVersion !== prev.brushVersion ||
                settings.showBrushStrokes !== prev.showBrushStrokes ||
                settings.watermarkText !== prev.watermarkText ||
                settings.watermarkSize !== prev.watermarkSize ||
                settings.watermarkOpacity !== prev.watermarkOpacity ||
                settings.watermarkColor !== prev.watermarkColor ||
                settings.watermarkPos !== prev.watermarkPos ||
                settings.isRound !== prev.isRound ||
                settings.scaleX !== prev.scaleX ||
                settings.scaleY !== prev.scaleY ||
                settings.rotation !== prev.rotation ||
                settings.gridSplitActive !== prev.gridSplitActive ||
                settings.gridSinglePieceView !== prev.gridSinglePieceView ||
                settings.gridEditMode !== prev.gridEditMode ||
                settings.gridPieceSettings !== prev.gridPieceSettings;

            if (!canvasSettingsChanged) {
                if (settings.gridSplitActive) {
                    if (settings.gridSinglePieceView) {
                        const singlePieceChanged =
                            settings.gridSelectedIndex !== prev.gridSelectedIndex ||
                            settings.gridCols !== prev.gridCols ||
                            settings.gridRows !== prev.gridRows;
                        if (!singlePieceChanged) return;
                    } else {
                        const isIndividual = settings.gridEditMode === 'individual';
                        const hasAnyOverrides = isIndividual && Object.values(settings.gridPieceSettings || {}).some(p => p && Object.keys(p).length > 0);
                        const gridDimensionsChanged =
                            settings.gridCols !== prev.gridCols ||
                            settings.gridRows !== prev.gridRows;
                        if (!gridDimensionsChanged || !hasAnyOverrides) return;
                    }
                } else {
                    return;
                }
            }
        }

        setIsProcessing(true);
        const genId = ++generationRef.current;

        setTimeout(() => {
            if (genId !== generationRef.current) return;
            const cropper = cropperInstanceRef.current;
            if (!cropper || !cropper.canvas) return;

            const canvas = generateCanvas(cropper, settings, protectionCanvasRef.current, true);

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

    // Trigger preview generation when the generator callback updates
    useEffect(() => {
        generatePreview();
        return () => {
            generationRef.current = -1; // Invalidate pending toBlob callbacks
        };
    }, [generatePreview]);

    // Only clean up the object URL and reset to null when the base image changes or the component unmounts
    useEffect(() => {
        return () => {
            setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        };
    }, [image]);

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

        // Real-time preview update during drawing (throttled to every 60ms)
        const now = Date.now();
        if (now - lastMoveUpdateRef.current > 60) {
            lastMoveUpdateRef.current = now;
            setSettings(s => ({ ...s, brushVersion: (s.brushVersion || 0) + 1 }));
        }
    };

    const handlePointerUp = (e) => {
        setIsDrawing(false);
        if (e.altKey && settings.isEraser) setSettings(prev => ({ ...prev, isEraser: false }));
        if (isBrushActive) {
            e.target.releasePointerCapture(e.pointerId);
            setSettings(s => ({ ...s, brushVersion: (s.brushVersion || 0) + 1 }));
        }
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
        else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.brushMode === 'remove' ? 'rgba(255, 0, 0, 1.0)' : 'rgba(0, 255, 0, 1.0)';
        }
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

            if (!container) {
                overlay.style.display = 'none'; pCanvas.style.display = 'none'; return;
            }

            const isViewMode = settings.selectedPreset === 'view' || !cropper.cropped;
            const targetBox = isViewMode ? canvasData : cropBoxData;

            if (!targetBox || targetBox.width === 0) {
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

            const transform = `translate3d(${offsetX + targetBox.left}px, ${offsetY + targetBox.top}px, 0)`;
            const widthPx = `${targetBox.width}px`;
            const heightPx = `${targetBox.height}px`;

            const naturalScale = imageData.naturalWidth / canvasData.width;
            const internalWidth = Math.round(targetBox.width * naturalScale);
            const internalHeight = Math.round(targetBox.height * naturalScale);

            overlay.style.width = widthPx; overlay.style.height = heightPx;
            overlay.style.transform = transform; overlay.style.borderRadius = settings.isRound ? '50%' : '0';

            if (pCanvas.width !== internalWidth || pCanvas.height !== internalHeight) {
                pCanvas.width = internalWidth; pCanvas.height = internalHeight;
            }
            pCanvas.style.width = widthPx; pCanvas.style.height = heightPx; pCanvas.style.transform = transform;
            pCanvas.style.opacity = settings.showBrushStrokes ? '0.4' : '0';

            const shouldShow = (isComplexMode && previewUrl && !isComparing && !isInteracting) || settings.gridSplitActive;
            overlay.style.display = shouldShow ? 'block' : 'none';
            pCanvas.style.display = isBrushActive ? 'block' : 'none';
            pCanvas.style.zIndex = 50; pCanvas.style.pointerEvents = 'none';
        });
    }, [previewUrl, isComparing, isInteracting, settings.isRound, settings.selectedPreset, isComplexMode, isBrushActive, activeTab, settings.gridSplitActive, settings.showBrushStrokes]);

    useEffect(() => { syncOverlayPosition(); }, [syncOverlayPosition]);

    // --- CROPPER INIT ---
    useLayoutEffect(() => {
        if (image && imageElementRef.current) {
            if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();
            const isViewMode = settings.selectedPreset === 'view';
            const cropper = new Cropper(imageElementRef.current, {
                viewMode: 1, dragMode: 'crop', zoomable: false, guides: true, background: false,
                autoCrop: !isViewMode, autoCropArea: 0.8,
                ready: () => {
                    if (settings.scaleX !== 1) cropper.scaleX(settings.scaleX);
                    if (isViewMode) {
                        cropper.clear();
                        cropper.disable();
                    }
                    syncOverlayPosition();
                    generatePreview();
                },
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
        const shouldResetCropBox = activeTab !== 'crop' && activeTab !== 'watermark';
        if (shouldResetCropBox) {
            const cropper = cropperInstanceRef.current;
            if (cropper && cropper.canvas && cropper.cropped) {
                try {
                    const canvasData = cropper.getCanvasData();
                    const cropBoxData = cropper.getCropBoxData();
                    const isFullWidth = Math.abs(cropBoxData.width - canvasData.width) < 1;
                    const isFullHeight = Math.abs(cropBoxData.height - canvasData.height) < 1;
                    if (!isFullWidth || !isFullHeight) {
                        cropper.setCropBoxData({ left: canvasData.left, top: canvasData.top, width: canvasData.width, height: canvasData.height });
                        setTimeout(() => syncOverlayPosition(), 0);
                    }
                } catch (e) { }
            }
        }
    }, [activeTab, isBrushActive, syncOverlayPosition]);

    // Interaction UI
    useEffect(() => {
        const wrapper = wrapperRef.current;
        const cropper = cropperInstanceRef.current;
        if (!wrapper || !cropper) return;
        const needsCropUI = (activeTab === 'crop' && !settings.gridSplitActive && settings.selectedPreset !== 'view') || activeTab === 'watermark';
        if (needsCropUI && !isBrushActive) { cropper.enable(); wrapper.classList.remove('cropper-disabled'); }
        else { cropper.disable(); wrapper.classList.add('cropper-disabled'); }
        if (isComplexMode && !isComparing && !isInteracting) { wrapper.classList.add('complex-mode-active'); }
        else { wrapper.classList.remove('complex-mode-active'); }

        let targetCursor = 'default';
        if (isBrushActive) targetCursor = 'crosshair';
        else if (isPicking) targetCursor = 'alias';
        else if (activeTab === 'watermark' && settings.watermarkText && typeof settings.watermarkPos === 'object') targetCursor = 'move';
        else if (activeTab === 'crop' && settings.selectedPreset !== 'view') targetCursor = 'crosshair';
        document.body.style.cursor = targetCursor;
    }, [activeTab, isBrushActive, isPicking, settings.dragMode, settings.watermarkText, settings.watermarkPos, isComparing, isComplexMode, isInteracting, settings.gridSplitActive, settings.selectedPreset]);

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
                    {settings.isEraser || (typeof window !== 'undefined' && window.event && window.event.altKey) ? (
                        <div className="bg-gray-800/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 border border-gray-700">
                            <span>🧼 Stroke Eraser Active</span>
                        </div>
                    ) : settings.brushMode === 'remove' ? (
                        <div className="bg-red-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 border border-red-500/30">
                            <span>🧹 Remove Brush Active (Hold Alt to Erase)</span>
                        </div>
                    ) : (
                        <div className="bg-green-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 border border-green-500/30">
                            <span>🛡️ Keep Brush Active (Hold Alt to Erase)</span>
                        </div>
                    )}
                </div>
            )}
            <div className="w-full h-full">
                <img ref={imageElementRef} src={image} crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', opacity: 0 }} alt="Target" />
            </div>
            <canvas ref={protectionCanvasRef} className="absolute top-0 left-0 z-30 pointer-events-none" style={{ display: 'none' }} />
            <div ref={overlayRef} className="absolute top-0 left-0 z-20 pointer-events-none" style={{ top: 0, left: 0, display: 'none', borderRadius: settings.isRound ? '50%' : '0' }}>
                {isComplexMode && (<div className="absolute inset-0 transparency-grid opacity-50 z-0" style={{ borderRadius: settings.isRound ? '50%' : '0' }}></div>)}

                {/* IMAGE RENDER */}
                {settings.gridSplitActive && settings.gridSinglePieceView ? (
                    // Single Piece isolated view
                    <div className="w-full h-full relative overflow-hidden" style={{ borderRadius: settings.isRound ? '50%' : '0' }}>
                        <img
                            src={previewUrl || image}
                            className="absolute top-0 left-0"
                            style={{
                                width: `${(Math.max(1, parseInt(settings.gridCols) || 1)) * 100}%`,
                                height: `${(Math.max(1, parseInt(settings.gridRows) || 1)) * 100}%`,
                                transform: `translate(-${(((settings.gridSelectedIndex || 0) % (Math.max(1, parseInt(settings.gridCols) || 1))) / (Math.max(1, parseInt(settings.gridCols) || 1))) * 100}%, -${(Math.floor((settings.gridSelectedIndex || 0) / (Math.max(1, parseInt(settings.gridCols) || 1))) / (Math.max(1, parseInt(settings.gridRows) || 1))) * 100}%)`,
                                objectFit: 'fill',
                                imageRendering: settings.interpolation === 'pixelated' ? 'pixelated' : 'auto',
                                maxWidth: 'none',
                                maxHeight: 'none',
                            }}
                            alt="Single Piece Preview"
                        />
                    </div>
                ) : (
                    // Standard full-view (can be previewUrl or raw image if previewUrl is null and we are in gridSplit tab)
                    (previewUrl || settings.gridSplitActive) && (
                        <img
                            src={previewUrl || image}
                            className="w-full h-full relative z-10"
                            style={{
                                objectFit: 'fill',
                                imageRendering: settings.interpolation === 'pixelated' ? 'pixelated' : 'auto',
                                borderRadius: settings.isRound ? '50%' : '0'
                            }}
                            alt="Preview"
                        />
                    )
                )}

                {/* Grid splitter interactive overlay */}
                {settings.gridSplitActive && !settings.gridSinglePieceView && (
                    <div
                        className="absolute inset-0 z-25"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${Math.max(1, parseInt(settings.gridCols) || 1)}, 1fr)`,
                            gridTemplateRows: `repeat(${Math.max(1, parseInt(settings.gridRows) || 1)}, 1fr)`,
                            border: '2px solid #3b82f6',
                        }}
                    >
                        {Array.from({ length: (Math.max(1, parseInt(settings.gridRows) || 1)) * (Math.max(1, parseInt(settings.gridCols) || 1)) }).map((_, idx) => {
                            const isSelected = idx === settings.gridSelectedIndex;
                            return (
                                <div
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSettings(s => ({ ...s, gridSelectedIndex: idx }));
                                    }}
                                    className={`border-[0.5px] border-white/30 transition-all cursor-pointer flex items-center justify-center relative pointer-events-auto ${isSelected
                                            ? 'bg-blue-500/20 border-2 border-blue-400 z-10 shadow-[0_0_15px_rgba(59,130,246,0.6)]'
                                            : 'hover:bg-white/10'
                                        }`}
                                >
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Visual Grid Mode overlay in Tune tab */}
                {settings.removeColorActive && settings.removeGridActive && activeTab === 'tune' && (
                    <div
                        className="absolute inset-0 z-20 pointer-events-none grid"
                        style={{
                            gridTemplateColumns: `repeat(${Math.max(1, parseInt(settings.removeGridCols) || 1)}, 1fr)`,
                            gridTemplateRows: `repeat(${Math.max(1, parseInt(settings.removeGridRows) || 1)}, 1fr)`,
                            border: '1.5px solid rgba(168, 85, 247, 0.75)',
                            borderRadius: settings.isRound ? '50%' : '0'
                        }}
                    >
                        {Array.from({ length: (Math.max(1, parseInt(settings.removeGridRows) || 1)) * (Math.max(1, parseInt(settings.removeGridCols) || 1)) }).map((_, i) => (
                            <div key={i} className="border-[0.5px] border-purple-500/40" />
                        ))}
                    </div>
                )}
            </div>
            {isComplexMode && isProcessing && !isInteracting && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
                </div>
            )}
        </div>
    );
}