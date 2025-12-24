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
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ocrWorkerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Initializing...');
  const [manualIsbn, setManualIsbn] = useState<string>('');

  useEffect(() => {
    console.log('[BarcodeScanner] Component mounted');
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    startScanning();

    return () => {
      console.log('[BarcodeScanner] Component unmounting, cleaning up');
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate();
      }
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

      setScanStatus('Scanning for barcode and ISBN text...');
      setIsScanning(true);
      console.log('[BarcodeScanner] Camera active, starting dual detection');
      
      ocrWorkerRef.current = await createWorker('eng', 1, {
        logger: () => {}
      });
      await ocrWorkerRef.current.setParameters({
        tessedit_char_whitelist: 'ISBN0123456789-X ',
      });
      
      startDualDetection();
    } catch (err: any) {
      console.error('[BarcodeScanner] Failed to start:', err);
      setError(err?.message || 'Failed to start camera. Please check permissions.');
      setScanStatus('Error occurred');
    }
  };

  const startDualDetection = () => {
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) return;
      
      try {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        
        if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        tryBarcodeDetection(canvas);
        tryOCRDetection(canvas, context);
      } catch (err) {
        console.error('[BarcodeScanner] Detection error:', err);
      }
    }, 1000);
  };

  const tryBarcodeDetection = async (canvas: HTMLCanvasElement) => {
    try {
      if (!codeReaderRef.current) return;
      
      const imageData = canvas.toDataURL('image/png');
      const img = new Image();
      img.src = imageData;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const result = await codeReaderRef.current.decodeFromImageElement(img);
      if (result) {
        const text = result.getText();
        const isbnMatch = text.match(/\d{10,13}/);
        if (isbnMatch && isbnMatch[0] !== lastScanned) {
          console.log('[BarcodeScanner] Barcode detected:', isbnMatch[0]);
          setLastScanned(isbnMatch[0]);
          onScan(isbnMatch[0]);
          handleClose();
        }
      }
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        console.error('[BarcodeScanner] Barcode error:', err);
      }
    }
  };

  const tryOCRDetection = async (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    try {
      if (!ocrWorkerRef.current) return;
      
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
      
      const { data: { text } } = await ocrWorkerRef.current.recognize(canvas);
      
      const isbnMatch = text.match(/ISBN[\s:-]*(\d[\d\s-]{9,16}\d|\d{9}[\dX])/i);
      
      if (isbnMatch) {
        const cleanIsbn = isbnMatch[1].replace(/[^0-9X]/gi, '');
        if (cleanIsbn.length >= 10 && cleanIsbn.length <= 13 && cleanIsbn !== lastScanned) {
          console.log('[BarcodeScanner] OCR detected:', cleanIsbn);
          setLastScanned(cleanIsbn);
          onScan(cleanIsbn);
          handleClose();
        }
      }
    } catch (err) {
      console.error('[BarcodeScanner] OCR error:', err);
    }
  };

  const handleManualSubmit = () => {
    const cleanIsbn = manualIsbn.replace(/[^0-9X]/gi, '');
    if (cleanIsbn.length >= 10 && cleanIsbn.length <= 13) {
      console.log('[BarcodeScanner] Manual ISBN entered:', cleanIsbn);
      onScan(cleanIsbn);
      handleClose();
    } else {
      setScanStatus('Please enter a valid 10 or 13 digit ISBN');
    }
  };

  const handleClose = () => {
    console.log('[BarcodeScanner] Closing scanner');
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    if (ocrWorkerRef.current) {
      ocrWorkerRef.current.terminate();
    }
    
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
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between rounded-t-xl">
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

          <div className="p-4 md:p-6">
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
                playsInline
                autoPlay
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-sm font-medium mb-3 ${isScanning ? 'text-green-600' : 'text-gray-600'}`}>
                  {scanStatus}
                </div>
                <p className="text-xs text-gray-500">
                  Scanning automatically with barcode + OCR detection
                </p>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or enter manually</span>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  placeholder="Enter ISBN (e.g., 9780892790796)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  inputMode="numeric"
                  pattern="[0-9X-]*"
                />
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  style={{ display: 'block', width: '100%' }}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg active:bg-blue-800"
                >
                  Submit ISBN
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Tip: Good lighting helps OCR. Hold book 6-12 inches away
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
