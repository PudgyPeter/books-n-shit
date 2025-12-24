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

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    startScanning();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera found');
      }

      const selectedDeviceId = videoDevices[videoDevices.length - 1]?.deviceId;

      if (codeReaderRef.current && videoRef.current) {
        codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText();
              if (text && text !== lastScanned) {
                setLastScanned(text);
                const isbnMatch = text.match(/\d{10,13}/);
                if (isbnMatch) {
                  onScan(isbnMatch[0]);
                  handleClose();
                }
              }
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error('Scan error:', error);
            }
          }
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start camera. Please check permissions.');
    }
  };

  const handleClose = () => {
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

          <div className="mt-4 text-center text-sm text-gray-600">
            <p className="font-medium">Position the ISBN barcode in the camera view</p>
            <p className="mt-1">Hold steady - scanning continuously...</p>
            <p className="mt-2 text-xs text-gray-500">
              Tip: Ensure good lighting and hold the book 6-12 inches from the camera
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
