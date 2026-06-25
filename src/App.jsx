// src/App.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import useDragDrop from "./hooks/useDragDrop";
import useHistory from "./hooks/useHistory";
import { generateCanvas, getGridPieceCanvas } from "./utils/canvasUtils";

const DEFAULT_SETTINGS = {
  // Geometry
  scaleX: 1, scaleY: 1, rotation: 0,
  customWidth: "", customHeight: "", lockAspectRatio: true,
  isRound: false, aspectRatio: NaN, selectedPreset: "free",
  
  // Format
  format: "image/jpeg", quality: 0.9, 
  dragMode: "crop",
  unit: "px", dpi: 300, interpolation: "high", 
  
  // Filters
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0,
  
  // Magic Eraser
  removeColorActive: false, removeColorHex: "#ffffff",
  removeTolerance: 10, removeErosion: 0, 
  removeContiguousOnly: true,
  removeGridActive: false, removeGridRows: 8, removeGridCols: 8,
  showMaskPreview: true, 
  brushActive: false,

  // Watermark
  watermarkText: "", watermarkSize: 40,
  watermarkOpacity: 0.8, watermarkColor: "#ffffff",
  watermarkPos: "Center", 

  // Grid Crop (Split)
  gridSplitActive: false,
  gridCols: 3, gridRows: 3,
  gridSelectedIndex: 0, gridSinglePieceView: false,
  gridEditMode: "all",
  gridPieceSettings: {},
  globalSettingsBackup: {
      brightness: 100, contrast: 100, saturation: 100,
      grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0,
      removeColorActive: false, removeColorHex: "#ffffff",
      removeTolerance: 10, removeErosion: 0, 
      removeContiguousOnly: true,
      removeGridActive: false, removeGridRows: 8, removeGridCols: 8,
      showMaskPreview: true, 
      brushActive: false,
      watermarkText: "", watermarkSize: 40,
      watermarkOpacity: 0.8, watermarkColor: "#ffffff",
      watermarkPos: "Center", 
      rotation: 0, scaleX: 1, scaleY: 1
  }
};

function App() {
  const { state: imageState, pushState: pushHistory, undo, redo, canUndo, canRedo, resetHistory } = useHistory(null);
  const [displayUrl, setDisplayUrl] = useState(null); // URL for the Editor
  const [settings, rawSetSettings] = useState(DEFAULT_SETTINGS);

  const setSettings = useCallback((updater) => {
      rawSetSettings(prev => {
          let next = typeof updater === 'function' ? updater(prev) : updater;
          
          const selectionChanged = next.gridSelectedIndex !== prev.gridSelectedIndex;
          const modeChanged = next.gridEditMode !== prev.gridEditMode;
          const activeChanged = next.gridSplitActive !== prev.gridSplitActive;
          
          if (selectionChanged || modeChanged || activeChanged) {
              if (next.gridSplitActive && next.gridEditMode === 'individual') {
                  const idx = next.gridSelectedIndex;
                  const pieceOverrides = next.gridPieceSettings[idx] || {};
                  
                  const baselineAdjustments = {
                      brightness: next.globalSettingsBackup?.brightness ?? 100,
                      contrast: next.globalSettingsBackup?.contrast ?? 100,
                      saturation: next.globalSettingsBackup?.saturation ?? 100,
                      grayscale: next.globalSettingsBackup?.grayscale ?? 0,
                      sepia: next.globalSettingsBackup?.sepia ?? 0,
                      invert: next.globalSettingsBackup?.invert ?? 0,
                      hue: next.globalSettingsBackup?.hue ?? 0,
                      blur: next.globalSettingsBackup?.blur ?? 0,
                      removeColorActive: next.globalSettingsBackup?.removeColorActive ?? false,
                      removeColorHex: next.globalSettingsBackup?.removeColorHex ?? "#ffffff",
                      removeTolerance: next.globalSettingsBackup?.removeTolerance ?? 10,
                      removeErosion: next.globalSettingsBackup?.removeErosion ?? 0,
                      removeContiguousOnly: next.globalSettingsBackup?.removeContiguousOnly ?? true,
                      removeGridActive: next.globalSettingsBackup?.removeGridActive ?? false,
                      removeGridRows: next.globalSettingsBackup?.removeGridRows ?? 8,
                      removeGridCols: next.globalSettingsBackup?.removeGridCols ?? 8,
                      showMaskPreview: next.globalSettingsBackup?.showMaskPreview ?? true,
                      brushActive: next.globalSettingsBackup?.brushActive ?? false,
                      watermarkText: next.globalSettingsBackup?.watermarkText ?? "",
                      watermarkSize: next.globalSettingsBackup?.watermarkSize ?? 40,
                      watermarkOpacity: next.globalSettingsBackup?.watermarkOpacity ?? 0.8,
                      watermarkColor: next.globalSettingsBackup?.watermarkColor ?? "#ffffff",
                      watermarkPos: next.globalSettingsBackup?.watermarkPos ?? "Center",
                      rotation: next.globalSettingsBackup?.rotation ?? 0,
                      scaleX: next.globalSettingsBackup?.scaleX ?? 1,
                      scaleY: next.globalSettingsBackup?.scaleY ?? 1
                  };
                  
                  next = {
                      ...next,
                      ...baselineAdjustments,
                      ...pieceOverrides
                  };
              } else {
                  next = {
                      ...next,
                      ...prev.globalSettingsBackup
                  };
              }
          }
          
          if (next.gridSplitActive && next.gridEditMode === 'individual') {
              const idx = next.gridSelectedIndex;
              
              const nonOverrideKeys = [
                  'gridSplitActive', 'gridCols', 'gridRows', 'gridSelectedIndex', 
                  'gridEditMode', 'gridSinglePieceView', 'gridPieceSettings', 'globalSettingsBackup',
                  'customWidth', 'customHeight', 
                  'lockAspectRatio', 'isRound', 'aspectRatio', 'selectedPreset', 
                  'format', 'quality', 'unit', 'dpi', 'interpolation'
              ];
              
              const updatedPieceSettings = {};
              let hasChanges = false;
              
              Object.keys(next).forEach(key => {
                  if (!nonOverrideKeys.includes(key)) {
                      const backupVal = next.globalSettingsBackup?.[key] ?? DEFAULT_SETTINGS[key];
                      if (next[key] !== backupVal) {
                          updatedPieceSettings[key] = next[key];
                          hasChanges = true;
                      }
                  }
              });
              
              next = {
                  ...next,
                  gridPieceSettings: hasChanges ? { [idx]: updatedPieceSettings } : {}
              };
          } else {
              const nonOverrideKeys = [
                  'gridSplitActive', 'gridCols', 'gridRows', 'gridSelectedIndex', 
                  'gridEditMode', 'gridSinglePieceView', 'gridPieceSettings', 'globalSettingsBackup',
                  'customWidth', 'customHeight', 
                  'lockAspectRatio', 'isRound', 'aspectRatio', 'selectedPreset', 
                  'format', 'quality', 'unit', 'dpi', 'interpolation'
              ];
              
              const updatedBackup = { ...prev.globalSettingsBackup };
              let backupChanged = false;
              
              Object.keys(next).forEach(key => {
                  if (!nonOverrideKeys.includes(key)) {
                      if (next[key] !== prev[key]) {
                          updatedBackup[key] = next[key];
                          backupChanged = true;
                      }
                  }
              });
              
              if (backupChanged) {
                  next = {
                      ...next,
                      globalSettingsBackup: updatedBackup
                  };
              }
          }
          
          return next;
      });
  }, [rawSetSettings]);
  const [isPicking, setIsPicking] = useState(false);
  const [activeTab, setActiveTab] = useState("crop");
  
  const cropperRef = useRef(null);
  const protectionRef = useRef(null);

  // --- MEMORY MANAGEMENT: Blob/DataURL -> ObjectURL ---
  useEffect(() => {
    if (!imageState) {
        setDisplayUrl(null);
        return;
    }

    let url;
    if (imageState instanceof Blob) {
        url = URL.createObjectURL(imageState);
    } else {
        // Handle initial load (usually DataURL)
        url = imageState;
    }
    
    setDisplayUrl(url);

    // Cleanup: If we created an ObjectURL, revoke it when state changes
    return () => {
        if (imageState instanceof Blob) {
            URL.revokeObjectURL(url);
        }
    };
  }, [imageState]);

  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        // Initial load can be DataURL (easier for small files), or convert to Blob immediately
        resetHistory(reader.result);
        let detectedFormat = "image/jpeg";
        if (file.type === "image/png") detectedFormat = "image/png";
        if (file.type === "image/webp") detectedFormat = "image/webp";
        setSettings({ ...DEFAULT_SETTINGS, format: detectedFormat, quality: file.size < 500000 ? 0.8 : 0.9 });
        setActiveTab("crop");
    };
    reader.readAsDataURL(file);
  };
  const handleFileChange = (e) => loadFile(e.target.files[0]);
  const isDragging = useDragDrop(loadFile);

  // --- PASTE HANDLER FIX ---
  useEffect(() => {
    const handlePaste = (e) => {
      // Ignore paste if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) loadFile(items[i].getAsFile());
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleUndo = () => { undo(); setSettings(s => ({ ...DEFAULT_SETTINGS, format: s.format, quality: s.quality })); };
  const handleRedo = () => { redo(); setSettings(s => ({ ...DEFAULT_SETTINGS, format: s.format, quality: s.quality })); };

  const handleApply = () => {
    const renderSettings = { ...settings, showMaskPreview: false, brushActive: false };
    const canvas = generateCanvas(cropperRef.current, renderSettings, protectionRef.current);
    if (!canvas) return;

    // SAVE AS BLOB (Critical for Memory)
    canvas.toBlob((blob) => {
        if (!blob) return;
        pushHistory(blob);

        // Cleanup Brush
        if (protectionRef.current) {
            const ctx = protectionRef.current.getContext('2d');
            ctx.clearRect(0, 0, protectionRef.current.width, protectionRef.current.height);
        }
        setSettings(prev => ({ ...DEFAULT_SETTINGS, format: prev.format, quality: prev.quality, dpi: prev.dpi, unit: prev.unit }));
    }, "image/png");
  };

  const actions = {
    registerCropper: (ref) => { cropperRef.current = ref.current; },
    registerProtection: (ref) => { protectionRef.current = ref.current; },

    setPresetRatio: (ratio, label) => {
      setSettings(s => ({ ...s, isRound: false, aspectRatio: ratio, selectedPreset: label, customWidth: "", customHeight: "" }));
      if (cropperRef.current) { cropperRef.current.enable(); cropperRef.current.setAspectRatio(ratio); }
    },
    toggleRound: () => {
      setSettings(s => ({ ...s, isRound: true, aspectRatio: 1, selectedPreset: "circle" }));
      if (cropperRef.current) { cropperRef.current.enable(); cropperRef.current.setAspectRatio(1); }
    },
    setFree: () => {
      if (settings.selectedPreset === "free") {
         setSettings(s => ({ ...s, selectedPreset: "view" }));
         if (cropperRef.current) { cropperRef.current.clear(); cropperRef.current.disable(); }
      } else {
         setSettings(s => ({ ...s, aspectRatio: NaN, selectedPreset: "free" }));
         if (cropperRef.current) { cropperRef.current.enable(); cropperRef.current.crop(); cropperRef.current.setAspectRatio(NaN); }
      }
    },
    rotate: (deg) => {
      if (settings.gridSplitActive && settings.gridEditMode === 'individual') {
        setSettings(s => ({ ...s, rotation: s.rotation + deg }));
      } else {
        if (cropperRef.current) { cropperRef.current.rotate(deg); setSettings(s => ({ ...s, rotation: s.rotation + deg })); }
      }
    },
    flipHorizontal: () => {
      if (settings.gridSplitActive && settings.gridEditMode === 'individual') {
        setSettings(s => ({ ...s, scaleX: s.scaleX === 1 ? -1 : 1 }));
      } else {
        if (cropperRef.current) { const newScale = settings.scaleX === 1 ? -1 : 1; cropperRef.current.scaleX(newScale); setSettings(s => ({ ...s, scaleX: newScale })); }
      }
    },
    flipVertical: () => {
      if (settings.gridSplitActive && settings.gridEditMode === 'individual') {
        setSettings(s => ({ ...s, scaleY: s.scaleY === 1 ? -1 : 1 }));
      } else {
        if (cropperRef.current) { const newScale = settings.scaleY === 1 ? -1 : 1; cropperRef.current.scaleY(newScale); setSettings(s => ({ ...s, scaleY: newScale })); }
      }
    },
    handleCustomSize: (val, type) => setSettings(s => ({ ...s, [type === 'w' ? 'customWidth' : 'customHeight']: val, selectedPreset: null })),
    handleUnitChange: (u) => setSettings(s => ({ ...s, unit: u })),
    resetFilters: () => setSettings(s => ({ ...s, brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0 })),
    togglePicker: () => setIsPicking(prev => !prev),
    cancel: () => { resetHistory(null); setSettings(DEFAULT_SETTINGS); },
    download: () => {
      const dlSettings = { ...settings, showMaskPreview: false };
      const canvas = generateCanvas(cropperRef.current, dlSettings, protectionRef.current);
      if (!canvas) return;
      
      let format = settings.format;
      if ((settings.removeColorActive || settings.isRound) && format === 'image/jpeg') format = 'image/png';
      
      // Use Blob for download too (better for large files)
      canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const ext = format.split("/")[1];
          link.download = `cropyfier-${Date.now()}.${ext}`;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, format, settings.quality);
    },
    copyToClipboard: () => {
       const cpSettings = { ...settings, showMaskPreview: false };
       const canvas = generateCanvas(cropperRef.current, cpSettings, protectionRef.current);
       if (!canvas) return;
       canvas.toBlob((blob) => {
         if (!blob) return;
         try {
           const item = new ClipboardItem({ "image/png": blob });
           navigator.clipboard.write([item]);
           alert("Image copied to clipboard!");
         } catch (err) { alert("Clipboard copy failed."); }
       }, "image/png");
    },
    downloadActivePiece: () => {
      if (!cropperRef.current) return;
      const cellCanvas = getGridPieceCanvas(cropperRef.current, settings, settings.gridSelectedIndex, protectionRef.current);
      if (!cellCanvas) return;

      let format = settings.format;
      if ((settings.removeColorActive || settings.isRound) && format === 'image/jpeg') format = 'image/png';
      const ext = format.split("/")[1];

      cellCanvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `cropyfier-split-part-${Math.floor(settings.gridSelectedIndex / settings.gridCols) + 1}_${(settings.gridSelectedIndex % settings.gridCols) + 1}-${Date.now()}.${ext}`;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, format, settings.quality);
    },
    downloadAllPieces: async () => {
      if (!cropperRef.current) return;
      const cols = Math.max(1, settings.gridCols || 1);
      const rows = Math.max(1, settings.gridRows || 1);
      const total = cols * rows;

      if (total > 25) {
          const confirmDownload = window.confirm(`You are about to download ${total} images. Your browser might prompt you to allow multiple file downloads. Proceed?`);
          if (!confirmDownload) return;
      }

      let format = settings.format;
      if ((settings.removeColorActive || settings.isRound) && format === 'image/jpeg') format = 'image/png';
      const ext = format.split("/")[1];

      for (let i = 0; i < total; i++) {
          const cellCanvas = getGridPieceCanvas(cropperRef.current, settings, i, protectionRef.current);
          if (!cellCanvas) continue;

          await new Promise((resolve) => {
              cellCanvas.toBlob((blob) => {
                  if (blob) {
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.download = `cropyfier-split-part-${Math.floor(i / cols) + 1}_${(i % cols) + 1}-${Date.now()}.${ext}`;
                      link.href = url;
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }
                  resolve();
              }, format, settings.quality);
          });
          await new Promise(r => setTimeout(r, 150));
      }
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col bg-[#020617] overflow-hidden selection:bg-blue-500/30">
      {settings.isRound && <style>{`.cropper-view-box, .cropper-face { border-radius: 50% !important; outline: 0 !important; }`}</style>}
      {isDragging && (
          <div className="absolute inset-0 z-[100] bg-blue-600/80 backdrop-blur-md flex items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold text-white animate-bounce drop-shadow-lg">Drop Image to Edit</div>
          </div>
      )}
      <Header version="v9.5 Pro" hasImage={!!imageState} onCancel={actions.cancel} onDownload={actions.download} onUndo={handleUndo} onRedo={handleRedo} onApply={handleApply} canUndo={canUndo} canRedo={canRedo} />
      <main className="flex-1 flex flex-col lg:flex-row relative w-full overflow-hidden">
        {!imageState ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            <div className="flex-1 relative order-1 lg:order-1 bg-[#020617] flex flex-col min-h-[30vh] lg:min-h-0 basis-auto shrink-1">
                 {/* Pass the computed displayUrl instead of the raw state */}
                 <Editor image={displayUrl} settings={settings} setSettings={setSettings} isPicking={isPicking} setIsPicking={setIsPicking} actions={actions} activeTab={activeTab} />
            </div>
            <div className="order-2 lg:order-2 flex-shrink-0 z-30">
                <Sidebar settings={settings} setSettings={setSettings} actions={actions} activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;