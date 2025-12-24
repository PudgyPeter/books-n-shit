'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { CameraIcon, XMarkIcon, CameraIcon as CaptureIcon } from '@heroicons/react/24/outline';
import { createWorker } from 'tesseract.js';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Initializing...');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  useEffect(() => {
    console.log('[BarcodeScanner] Component mounted');
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    startScanning();

    return () => {
      console.log('[BarcodeScanner] Component unmounting, cleaning up');
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      console.log('[BarcodeScanner] Starting scan process...');
      setError(null);
      setScanStatus('Requesting camera access...');
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanStatus('Camera ready - Use button below to capture ISBN');
      setIsScanning(true);
      console.log('[BarcodeScanner] Camera active');
    } catch (err: any) {
      console.error('[BarcodeScanner] Failed to start:', err);
      setError(err?.message || 'Failed to start camera. Please check permissions.');
      setScanStatus('Error occurred');
    }
  };

  const captureAndProcessOCR = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      setIsProcessingOCR(true);
      setScanStatus('Capturing image...');
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      setScanStatus('Enhancing image quality...');
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const threshold = avg > 128 ? 255 : 0;
        data[i] = threshold;
        data[i + 1] = threshold;
        data[i + 2] = threshold;
      }
      
      context.putImageData(imageData, 0, 0);
      
      setScanStatus('Reading ISBN text...');
      console.log('[BarcodeScanner] Starting OCR...');
      
      const worker = await createWorker('eng', 1, {
        logger: () => {}
      });
      
      await worker.setParameters({
        tessedit_char_whitelist: 'ISBN0123456789-X ',
      });
      
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();
      
      console.log('[BarcodeScanner] OCR result:', text);
      
      const isbnMatch = text.match(/ISBN[\s:-]*(\d[\d\s-]{9,16}\d|\d{9}[\dX])/i);
      
      if (isbnMatch) {
        const cleanIsbn = isbnMatch[1].replace(/[^0-9X]/gi, '');
        if (cleanIsbn.length >= 10 && cleanIsbn.length <= 13) {
          console.log('[BarcodeScanner] Valid ISBN found via OCR:', cleanIsbn);
          onScan(cleanIsbn);
          handleClose();
          return;
        }
      }
      
      setScanStatus('No ISBN found. Try again with better lighting or closer view.');
      setIsProcessingOCR(false);
    } catch (err: any) {
      console.error('[BarcodeScanner] OCR error:', err);
      setScanStatus('OCR failed. Try again.');
      setIsProcessingOCR(false);
    }
  };

  const handleClose = () => {
    console.log('[BarcodeScanner] Closing scanner');
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Scan ISBN</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          ) : null}

          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              className="w-full h-auto"
              style={{ maxHeight: '300px' }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="text-center">
            <div className={`text-sm font-medium mb-3 ${isScanning ? 'text-green-600' : 'text-gray-600'}`}>
              {scanStatus}
            </div>
            
            <button
              onClick={captureAndProcessOCR}
              disabled={isProcessingOCR}
              className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
            >
              <CaptureIcon className="w-5 h-5" />
              {isProcessingOCR ? 'Reading ISBN Text...' : 'Capture & Read ISBN Text'}
            </button>
            
            <p className="text-xs text-gray-500 mb-1">
              Barcode not working? Use the button above to read the ISBN text
            </p>
            <p className="text-xs text-gray-400">
              Tip: Good lighting helps. Hold book 6-12 inches away
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
