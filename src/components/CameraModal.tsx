import React, { useRef, useState, useEffect } from "react";
import { Camera, X, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      let mediaStream;
      try {
        // Try for back camera first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err) {
        console.warn("Environment camera not found, falling back to any camera:", err);
        // Fallback to any available camera (usually front/webcam on desktops)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsReady(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions and ensure your device has a camera.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsReady(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(base64);
    }
  };

  const handleDone = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col relative"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              Capture Instruction Image
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="relative aspect-video bg-black flex items-center justify-center">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                    <RefreshCw className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="p-6 flex items-center justify-center gap-4">
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                disabled={!isReady}
                className="w-16 h-16 bg-white border-4 border-indigo-600 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-full" />
              </button>
            ) : (
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setCapturedImage(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake
                </button>
                <button
                  onClick={handleDone}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Use Image
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CameraModal;
