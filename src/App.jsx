// src/App.jsx
import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import useDragDrop from "./hooks/useDragDrop";
import useHistory from "./hooks/useHistory"; // IMPORTED
import { generateCanvas } from "./utils/canvasUtils";

// Define outside so we can reset easily
const DEFAULT_SETTINGS = {
  // Geometry
  scaleX: 1, scaleY: 1, rotation: 0,
  customWidth: "", customHeight: "", lockAspectRatio: true,
  isRound: false, aspectRatio: NaN, selectedPreset: "free",
  
  // Format (Keep these persistent usually, but reset for now)
  format: "image/jpeg", quality: 0.9, 
  dragMode: "crop",
  unit: "px", dpi: 300, interpolation: "high", 
  
  // Filters
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0,
  
  // Magic Eraser
  removeColorActive: false, removeColorHex: "#ffffff",
  removeTolerance: 10, removeErosion: 0, 

  // Watermark
  watermarkText: "", watermarkSize: 40,
  watermarkOpacity: 0.8, watermarkColor: "#ffffff",
  watermarkPos: "Center", 
};

function App() {
  // Replace simple image state with History Hook
  const { 
    state: image, 
    pushState: pushHistory, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    resetHistory 
  } = useHistory(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isPicking, setIsPicking] = useState(false);
  const [activeTab, setActiveTab] = useState("crop");
  
  const cropperRef = useRef(null);

  // File Loading Logic
  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        // Reset everything on new file upload
        resetHistory(reader.result);
        
        let detectedFormat = "image/jpeg";
        if (file.type === "image/png") detectedFormat = "image/png";
        if (file.type === "image/webp") detectedFormat = "image/webp";
        
        setSettings({ 
            ...DEFAULT_SETTINGS, 
            format: detectedFormat,
            quality: file.size < 500000 ? 0.8 : 0.9 
        });
        setActiveTab("crop");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => loadFile(e.target.files[0]);
  const isDragging = useDragDrop(loadFile);

  // Paste Support
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) loadFile(items[i].getAsFile());
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // --- UNDO / REDO HANDLERS ---
  const handleUndo = () => {
    undo();
    // When undoing, we must reset settings to default, otherwise 
    // the filters/crops will apply on top of the old image state.
    setSettings(s => ({ ...DEFAULT_SETTINGS, format: s.format, quality: s.quality }));
  };

  const handleRedo = () => {
    redo();
    setSettings(s => ({ ...DEFAULT_SETTINGS, format: s.format, quality: s.quality }));
  };

  // --- SAVE / APPLY LOGIC ---
  const handleApply = () => {
    const canvas = generateCanvas(cropperRef.current, settings);
    if (!canvas) return;

    // Convert current state to a PNG DataURL (Always PNG to preserve transparency during edits)
    // We don't use the user's selected format (e.g. JPG) until the final Download.
    const newImageState = canvas.toDataURL("image/png");

    // 1. Push new image to history stack
    pushHistory(newImageState);

    // 2. Reset "Destructive" Settings
    // We keep format/quality/dpi settings, but reset geometry, filters, and eraser
    setSettings(prev => ({
        ...DEFAULT_SETTINGS,
        format: prev.format,
        quality: prev.quality,
        dpi: prev.dpi,
        unit: prev.unit
    }));
  };

  const actions = {
    registerCropper: (ref) => { cropperRef.current = ref.current; },
    
    setPresetRatio: (ratio, label) => {
      setSettings(s => ({ 
          ...s, 
          isRound: false, 
          aspectRatio: ratio, 
          selectedPreset: label, 
          customWidth: "", customHeight: "" 
      }));
      if (cropperRef.current) {
          cropperRef.current.enable();
          cropperRef.current.setAspectRatio(ratio);
      }
    },
    
    toggleRound: () => {
      setSettings(s => ({ ...s, isRound: true, aspectRatio: 1, selectedPreset: "circle" }));
      if (cropperRef.current) {
        cropperRef.current.enable();
        cropperRef.current.setAspectRatio(1);
      }
    },
    
    setFree: () => {
      if (settings.selectedPreset === "free") {
         setSettings(s => ({ ...s, selectedPreset: "view" }));
         if (cropperRef.current) {
            cropperRef.current.clear();
            cropperRef.current.disable();
         }
      } else {
         setSettings(s => ({ ...s, aspectRatio: NaN, selectedPreset: "free" }));
         if (cropperRef.current) {
            cropperRef.current.enable();
            cropperRef.current.crop();
            cropperRef.current.setAspectRatio(NaN);
         }
      }
    },
    
    rotate: (deg) => {
      if (cropperRef.current) {
        cropperRef.current.rotate(deg);
        setSettings(s => ({ ...s, rotation: s.rotation + deg }));
      }
    },
    
    flipHorizontal: () => {
      if (cropperRef.current) {
        const newScale = settings.scaleX === 1 ? -1 : 1;
        cropperRef.current.scaleX(newScale);
        setSettings(s => ({ ...s, scaleX: newScale }));
      }
    },
    
    flipVertical: () => {
      if (cropperRef.current) {
        const newScale = settings.scaleY === 1 ? -1 : 1;
        cropperRef.current.scaleY(newScale);
        setSettings(s => ({ ...s, scaleY: newScale }));
      }
    },
    
    handleCustomSize: (val, type) => {
      setSettings(s => ({ 
          ...s, 
          [type === 'w' ? 'customWidth' : 'customHeight']: val, 
          selectedPreset: null 
      }));
    },
    
    handleUnitChange: (u) => setSettings(s => ({ ...s, unit: u })),
    
    resetFilters: () => {
      setSettings(s => ({ ...s, brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0 }));
    },
    
    togglePicker: () => setIsPicking(prev => !prev),
    
    cancel: () => {
      resetHistory(null);
      setSettings(DEFAULT_SETTINGS);
    },

    download: () => {
      // For final download, we generate based on current settings
      const canvas = generateCanvas(cropperRef.current, settings);
      if (!canvas) return;
      
      const link = document.createElement("a");
      let format = settings.format;
      if ((settings.removeColorActive || settings.isRound) && format === 'image/jpeg') {
          format = 'image/png';
      }
      const ext = format.split("/")[1];
      link.download = `cropyfier-${Date.now()}.${ext}`;
      link.href = canvas.toDataURL(format, settings.quality);
      link.click();
    },
    
    copyToClipboard: () => {
       const canvas = generateCanvas(cropperRef.current, settings);
       if (!canvas) return;
       canvas.toBlob((blob) => {
         if (!blob) return;
         try {
           const item = new ClipboardItem({ "image/png": blob });
           navigator.clipboard.write([item]);
           alert("Image copied to clipboard!");
         } catch (err) {
           alert("Clipboard copy failed. Try downloading instead.");
         }
       }, "image/png");
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col bg-[#020617] overflow-hidden selection:bg-blue-500/30">
      
      {settings.isRound && (
        <style>{`
            .cropper-view-box, .cropper-face { 
                border-radius: 50% !important; 
                outline: 0 !important; 
            }
        `}</style>
      )}

      {isDragging && (
          <div className="absolute inset-0 z-[100] bg-blue-600/80 backdrop-blur-md flex items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold text-white animate-bounce drop-shadow-lg">Drop Image to Edit</div>
          </div>
      )}

      <Header 
        version="v9.5 Pro" 
        hasImage={!!image} 
        onCancel={actions.cancel} 
        onDownload={actions.download}
        
        // Pass Undo/Redo/Save props
        onUndo={handleUndo}
        onRedo={handleRedo}
        onApply={handleApply}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row relative w-full overflow-hidden">
        {!image ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            <div className="flex-1 relative order-1 lg:order-1 bg-[#020617] flex flex-col min-h-[30vh] lg:min-h-0 basis-auto shrink-1">
                 <Editor 
                    image={image} 
                    settings={settings} 
                    setSettings={setSettings}
                    isPicking={isPicking}
                    setIsPicking={setIsPicking}
                    actions={actions}
                    activeTab={activeTab}
                />
            </div>

            <div className="order-2 lg:order-2 flex-shrink-0 z-30">
                <Sidebar 
                    settings={settings} 
                    setSettings={setSettings} 
                    actions={actions}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;