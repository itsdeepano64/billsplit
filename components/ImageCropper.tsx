"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, Check, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  imageSrc: string;          // object URL of the selected file
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

// ─── Canvas crop helper ───────────────────────────────────────────────────────

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImageBitmap(await (await fetch(imageSrc)).blob());

  const canvas = document.createElement("canvas");
  // Always output at 1200×800 — plenty for a login screen background
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      0.92,
    );
  });
}

// ─── Cropper UI ───────────────────────────────────────────────────────────────

export default function ImageCropper({ imageSrc, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch (err) {
      console.error("Crop failed", err);
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <p className="text-white/60 text-sm font-medium">Drag · Pinch to zoom</p>
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
        >
          {processing ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Use Photo
        </button>
      </div>

      {/* Crop area */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3 / 2}           // matches the login screen ratio
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle: { border: "2px solid rgba(255,255,255,0.5)", borderRadius: "16px" },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-6 py-5 flex-shrink-0 space-y-2"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-white/50 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-white/20
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-md"
          />
          <ZoomIn className="w-4 h-4 text-white/50 flex-shrink-0" />
        </div>
        <p className="text-center text-xs text-white/30">
          {Math.round(zoom * 100)}% zoom
        </p>
      </div>
    </div>
  );
}
