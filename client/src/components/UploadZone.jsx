import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { extractGrid } from '../utils/opencv';
import { recognizeDigits } from '../utils/ocr';

export default function UploadZone({ onGridReady, isProcessing }) {
  const [dragActive, setDragActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const MotionDiv = motion.div;

  const processImage = async (imageSrc) => {
    try {
      setError(null);
      // Wait for image to load to grab dimensions for OpenCV
      const img = new Image();
      img.src = imageSrc;
      await new Promise(r => { img.onload = r; });

      // Run OpenCV Grid Extraction Pipeline
      const cellMats = await extractGrid(img);
      
      // Run TF.js OCR
      const { grid, uncertainties, debugImages, status: ocrStatus } = await recognizeDigits(cellMats);
      
      if (ocrStatus === "demo") {
        setError("AI model unavailable – running in demo mode");
      } else {
        setError(null);
      }

      // Send extracted grid up to App
      onGridReady(grid, uncertainties, { ocrStatus, debugImages });
    } catch (err) {
      console.error(err);
      setError(`Failed to read Sudoku from image: ${err.message || err.toString()}`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        processImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        processImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch(err) {
      console.error(err);
      setError("Camera access denied or unavailable.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageSrc = canvas.toDataURL('image/jpeg');
      stopCamera();
      processImage(imageSrc);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <AnimatePresence mode="wait">
        {cameraActive ? (
          <MotionDiv 
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#4fd1c5]/30 bg-black"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button 
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button 
                onClick={captureFrame}
                className="px-6 py-2 bg-[#4fd1c5] text-black font-bold rounded-lg hover:bg-[#38b2a6] shadow-[0_0_15px_rgba(79,209,197,0.5)] transition"
              >
                Capture Grid
              </button>
            </div>
          </MotionDiv>
        ) : (
          <MotionDiv 
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 backdrop-blur-md bg-[#1a1c23]/80 ${
              dragActive ? 'border-[#4fd1c5] bg-[#4fd1c5]/10 shadow-[0_0_20px_rgba(79,209,197,0.2)]' : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
             {isProcessing ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-t-[#4fd1c5] border-r-[#9f7aea] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-300 font-medium animate-pulse">Running AI Vision Pipeline...</p>
                </div>
             ) : (
                <>
                  <div className="text-4xl mb-4">📸</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Drop Sudoku picture here</h3>
                  <p className="text-sm text-gray-400 mb-6">Or click to browse from your device</p>
                  
                  <div className="flex justify-center gap-4">
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-[#2d3748] hover:bg-[#4a5568] transition rounded-lg text-sm font-medium"
                    >
                      Browse Files
                    </button>
                    <button 
                      onClick={startCamera}
                      className="px-5 py-2.5 bg-linear-to-r from-[#4fd1c5] to-[#9f7aea] text-black hover:opacity-90 transition rounded-lg text-sm font-bold shadow-[0_0_10px_rgba(159,122,234,0.4)]"
                    >
                      Open Camera
                    </button>
                  </div>
                </>
             )}
          </MotionDiv>
        )}
      </AnimatePresence>

      {error && (
        <MotionDiv 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center"
        >
          {error}
        </MotionDiv>
      )}
    </div>
  );
}
