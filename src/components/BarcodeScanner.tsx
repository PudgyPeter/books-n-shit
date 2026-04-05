'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

function isValidIsbn(str: string) {
  const clean = str.replace(/[^0-9X]/gi, '');
  return clean.length === 10 || clean.length === 13;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const zxingRef = useRef<any>(null);
  const lastScannedRef = useRef<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<'init' | 'scanning' | 'found' | 'error'>('init');
  const [statusMsg, setStatusMsg] = useState('Starting camera...');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualError, setManualError] = useState('');
  const [engine, setEngine] = useState<'native' | 'zxing' | null>(null);

  const handleFound = useCallback((isbn: string) => {
    const clean = isbn.replace(/[^0-9X]/gi, '');
    if (clean === lastScannedRef.current) return;
    lastScannedRef.current = clean;
    setStatus('found');
    setStatusMsg(`Found: ${clean}`);
    onScan(clean);
    cleanup();
    onClose();
  }, [onScan, onClose]);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (zxingRef.current) zxingRef.current.reset();
  }, []);

  useEffect(() => {
    startCamera();
    return cleanup;
  }, []);

  const startCamera = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      const backCameras = videoDevices.filter(d => {
        const l = d.label.toLowerCase();
        return l.includes('back') || l.includes('rear') || l.includes('environment') || l.includes('camera2 0');
      });

      let stream: MediaStream;
      try {
        const preferred = backCameras.find(c => {
          const l = c.label.toLowerCase();
          return !l.includes('wide') && !l.includes('ultra') && !l.includes('0.5');
        }) ?? backCameras[backCameras.length - 1];

        stream = preferred
          ? await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: preferred.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            })
          : await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (window.BarcodeDetector) {
        setEngine('native');
        setStatus('scanning');
        setStatusMsg('Point camera at barcode');
        startNativeScan();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/library');
        zxingRef.current = new BrowserMultiFormatReader();
        setEngine('zxing');
        setStatus('scanning');
        setStatusMsg('Point camera at barcode');
        startZxingScan();
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err?.message?.includes('Permission') ? 'Camera permission denied' : 'Could not start camera');
    }
  };

  const startNativeScan = () => {
    const detector = new window.BarcodeDetector!({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });

    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        for (const barcode of barcodes) {
          if (isValidIsbn(barcode.rawValue)) {
            handleFound(barcode.rawValue);
            return;
          }
        }
      } catch {}
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const startZxingScan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let busy = false;

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || busy) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      busy = true;
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          const img = new Image();
          img.src = canvas.toDataURL('image/png');
          await new Promise(r => { img.onload = r; });

          const result = await zxingRef.current.decodeFromImageElement(img);
          if (result) {
            const text = result.getText();
            const match = text.match(/\d{10,13}/);
            if (match && isValidIsbn(match[0])) {
              handleFound(match[0]);
              return;
            }
          }
        }
      } catch {}
      busy = false;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleManualSubmit = () => {
    const clean = manualIsbn.replace(/[^0-9X]/gi, '');
    if (!isValidIsbn(clean)) {
      setManualError('Enter a valid 10 or 13 digit ISBN');
      return;
    }
    setManualError('');
    onScan(clean);
    cleanup();
    onClose();
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <span className="text-white text-sm font-medium">Scan ISBN barcode</span>
        <button onClick={handleClose} className="text-white/70 hover:text-white active:scale-90 transition p-1">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Camera */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-72 h-36">
            {/* Dark overlay outside box */}
            <div className="absolute inset-0" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-sm" style={{ borderWidth: '3px 0 0 3px' }} />
            <div className="absolute top-0 right-0 w-6 h-6 border-white rounded-tr-sm" style={{ borderWidth: '3px 3px 0 0' }} />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-white rounded-bl-sm" style={{ borderWidth: '0 0 3px 3px' }} />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-white rounded-br-sm" style={{ borderWidth: '0 3px 3px 0' }} />
            {/* Scan line animation */}
            {status === 'scanning' && (
              <div className="absolute left-0 right-0 h-0.5 bg-blue-400/80" style={{ animation: 'scanline 2s ease-in-out infinite' }} />
            )}
          </div>
        </div>

        {/* Status pill */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            status === 'error' ? 'bg-red-500/90 text-white' :
            status === 'found' ? 'bg-green-500/90 text-white' :
            'bg-black/60 text-white/90'
          }`}>
            {statusMsg}
            {engine === 'zxing' && status === 'scanning' && (
              <span className="ml-2 text-white/50 text-xs">ZXing</span>
            )}
          </div>
        </div>
      </div>

      {/* Manual entry panel */}
      <div className="bg-zinc-900 px-4 pt-4 pb-6 safe-area-bottom">
        <p className="text-zinc-400 text-xs text-center mb-3">or enter manually</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualIsbn}
            onChange={(e) => { setManualIsbn(e.target.value); setManualError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            placeholder="ISBN (e.g. 9780892790796)"
            className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 px-3 py-3 rounded-xl text-sm border border-zinc-700 focus:border-blue-500 focus:outline-none"
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-3 rounded-xl text-sm font-medium transition"
          >
            Go
          </button>
        </div>
        {manualError && <p className="text-red-400 text-xs mt-2">{manualError}</p>}
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
