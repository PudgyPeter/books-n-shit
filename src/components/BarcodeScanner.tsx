'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader');
    scannerRef.current = scanner;

    startScanning();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      await scannerRef.current?.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          const isbnMatch = decodedText.match(/\d{10,13}/);
          if (isbnMatch) {
            onScan(isbnMatch[0]);
            handleClose();
          }
        },
        () => {}
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to start camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const handleClose = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
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
            <div id="barcode-reader" className="w-full"></div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Position the ISBN barcode within the frame</p>
            <p className="mt-1">The scanner will automatically detect and read the barcode</p>
          </div>
        </div>
      </div>
    </div>
  );
}
