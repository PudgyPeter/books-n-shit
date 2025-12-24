'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Initializing...');

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
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('[BarcodeScanner] Found cameras:', videoDevices.length);
      
      if (videoDevices.length === 0) {
        throw new Error('No camera found');
      }

      const selectedDeviceId = videoDevices[videoDevices.length - 1]?.deviceId;
      console.log('[BarcodeScanner] Using camera:', selectedDeviceId);

      setScanStatus('Starting camera...');

      if (codeReaderRef.current && videoRef.current) {
        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText();
              console.log('[BarcodeScanner] Barcode detected:', text);
              
              if (text && text !== lastScanned) {
                setLastScanned(text);
                setScanStatus(`Detected: ${text}`);
                
                const isbnMatch = text.match(/\d{10,13}/);
                if (isbnMatch) {
                  console.log('[BarcodeScanner] Valid ISBN found:', isbnMatch[0]);
                  onScan(isbnMatch[0]);
                  handleClose();
                } else {
                  console.log('[BarcodeScanner] Not a valid ISBN format');
                  setScanStatus('Not an ISBN barcode, keep scanning...');
                }
              }
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error('[BarcodeScanner] Scan error:', error);
            }
          }
        );
        
        setIsScanning(true);
        setScanStatus('Scanning... Point camera at ISBN barcode');
        console.log('[BarcodeScanner] Scanner active');
      }
    } catch (err: any) {
      console.error('[BarcodeScanner] Failed to start:', err);
      setError(err?.message || 'Failed to start camera. Please check permissions.');
      setScanStatus('Error occurred');
    }
  };

  const handleClose = () => {
    console.log('[BarcodeScanner] Closing scanner');
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Scan ISBN Barcode</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          ) : null}

          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-auto"
              style={{ maxHeight: '400px' }}
            />
          </div>

          <div className="mt-4 text-center">
            <div className={`text-sm font-medium mb-2 ${isScanning ? 'text-green-600' : 'text-gray-600'}`}>
              {scanStatus}
            </div>
            <p className="text-xs text-gray-500">
              Tip: Ensure good lighting and hold the book 6-12 inches from the camera
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Check browser console (F12) for detailed scanning logs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
