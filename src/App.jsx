// src/App.jsx
import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import useDragDrop from "./hooks/useDragDrop";
import useHistory from "./hooks/useHistory";
import { generateCanvas } from "./utils/canvasUtils";

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
  showMaskPreview: true, 
  brushActive: false,

  // Watermark
  watermarkText: "", watermarkSize: 40,
  watermarkOpacity: 0.8, watermarkColor: "#ffffff",
  watermarkPos: "Center", 
};

function App() {
  const { state: imageState, pushState: pushHistory, undo, redo, canUndo, canRedo, resetHistory } = useHistory(null);
  const [displayUrl, setDisplayUrl] = useState(null); // URL for the Editor
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
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
      if (cropperRef.current) { cropperRef.current.rotate(deg); setSettings(s => ({ ...s, rotation: s.rotation + deg })); }
    },
    flipHorizontal: () => {
      if (cropperRef.current) { const newScale = settings.scaleX === 1 ? -1 : 1; cropperRef.current.scaleX(newScale); setSettings(s => ({ ...s, scaleX: newScale })); }
    },
    flipVertical: () => {
      if (cropperRef.current) { const newScale = settings.scaleY === 1 ? -1 : 1; cropperRef.current.scaleY(newScale); setSettings(s => ({ ...s, scaleY: newScale })); }
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