
import React, { useState, useEffect, useRef } from 'react';
import { Actor } from '../types';
import { CANVAS_SIZE } from '../constants';
import { Trash2, Pencil, Eraser, PaintBucket, RefreshCw } from 'lucide-react';

interface SpriteEditorProps {
  actor: Actor;
  onUpdate: (updatedActor: Actor) => void;
  onDelete: (actorId: string) => void;
  isHero: boolean;
}

export const SpriteEditor: React.FC<SpriteEditorProps> = ({ actor, onUpdate, onDelete, isHero }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(actor.name);
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState<'PENCIL' | 'ERASER' | 'FILL'>('PENCIL');
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas with High DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      // Visual size
      canvas.style.width = '500px';
      canvas.style.height = '500px';
      // Actual size
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const img = new Image();
        img.src = actor.imageData;
        img.onload = () => {
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        };
      }
    }
    setName(actor.name);
  }, [actor.id]);

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const newImageData = canvas.toDataURL();
      onUpdate({ ...actor, name, imageData: newImageData });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      saveCanvas();
    }
  };

  const getCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_SIZE / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_SIZE / rect.height)
    };
  };

  // --- FLOOD FILL LOGIC ---
  const hexToRgba = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b, 255];
  };

  const floodFill = (startX: number, startY: number, fillColor: string) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width;
      const h = canvas.height;
      
      // Get image data (working on physical pixels)
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Convert logical start coords to physical
      const px = Math.floor(startX * dpr);
      const py = Math.floor(startY * dpr);

      if (px < 0 || px >= w || py < 0 || py >= h) return;

      // Get start color
      const startPos = (py * w + px) * 4;
      const startR = data[startPos];
      const startG = data[startPos + 1];
      const startB = data[startPos + 2];
      const startA = data[startPos + 3]; // Alpha

      const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

      // If color is the same, exit
      // (We compare with a small tolerance for identical re-clicks)
      if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;

      const tolerance = 50; // Tolerance for anti-aliased edges

      const colorMatch = (pos: number) => {
          const r = data[pos];
          const g = data[pos + 1];
          const b = data[pos + 2];
          const a = data[pos + 3];
          
          const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB) + Math.abs(a - startA);
          return diff < tolerance;
      };

      const setPixel = (pos: number) => {
          data[pos] = fillR;
          data[pos + 1] = fillG;
          data[pos + 2] = fillB;
          data[pos + 3] = fillA;
      };

      const stack = [[px, py]];
      const seen = new Uint8Array(w * h); // Keep track of visited pixels to prevent loops

      while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          const idx = cy * w + cx;
          
          if (seen[idx]) continue;
          
          const pos = idx * 4;
          if (colorMatch(pos)) {
              setPixel(pos);
              seen[idx] = 1;

              if (cx > 0) stack.push([cx - 1, cy]);
              if (cx < w - 1) stack.push([cx + 1, cy]);
              if (cy > 0) stack.push([cx, cy - 1]);
              if (cy < h - 1) stack.push([cx, cy + 1]);
          }
      }

      ctx.putImageData(imgData, 0, 0);
      saveCanvas();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'FILL') {
        // Run Flood Fill
        floodFill(x, y, color);
        setIsDrawing(false);
        return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'ERASER' ? 12 : 5; 
    ctx.strokeStyle = tool === 'ERASER' ? 'rgba(255,255,255,1)' : color;
    ctx.globalCompositeOperation = tool === 'ERASER' ? 'destination-out' : 'source-over';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (isDrawing) {
        setIsDrawing(false);
        saveCanvas();
    }
  };

  return (
    <div className="flex w-full h-full items-center justify-center gap-4 p-4 relative">
      
      {/* TOOLS LEFT */}
      <div className="flex flex-col gap-3 h-full justify-center">
          <button onClick={() => setTool('PENCIL')} className={`w-16 h-16 sketch-btn text-3xl ${tool === 'PENCIL' ? 'sketch-btn-active bg-yellow-200' : ''}`}>
              <Pencil size={32} strokeWidth={2.5} />
          </button>
          <button onClick={() => setTool('ERASER')} className={`w-16 h-16 sketch-btn text-3xl ${tool === 'ERASER' ? 'sketch-btn-active bg-pink-200' : ''}`}>
              <Eraser size={32} strokeWidth={2.5} />
          </button>
          <button onClick={() => setTool('FILL')} className={`w-16 h-16 sketch-btn text-3xl ${tool === 'FILL' ? 'sketch-btn-active bg-blue-200' : ''}`}>
              <PaintBucket size={32} strokeWidth={2.5} />
          </button>
          <div className="h-4 border-b-2 border-black/10"></div>
          <button onClick={clearCanvas} className="w-16 h-16 sketch-btn hover:bg-gray-100">
              <RefreshCw size={32} strokeWidth={2.5} />
          </button>
      </div>

      {/* CANVAS CENTER */}
      <div className="flex flex-col items-center justify-center h-full max-h-full">
          <div className="sketch-box p-2 rotate-1 bg-white shadow-xl max-w-full max-h-full overflow-hidden flex items-center justify-center">
            <canvas 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="bg-transparent cursor-crosshair touch-none max-w-full max-h-[60vh] object-contain"
                style={{
                    width: '500px',
                    height: '500px',
                    backgroundImage: 'radial-gradient(#e5e7eb 2px, transparent 2px)',
                    backgroundSize: '20px 20px',
                }}
            />
          </div>
          <input 
             className="text-center text-4xl mt-4 bg-transparent border-b-4 border-black/20 focus:border-black outline-none font-bold p-1 w-64"
             value={name}
             onChange={(e) => { setName(e.target.value); onUpdate({...actor, name: e.target.value}) }}
          />
      </div>

      {/* COLORS RIGHT */}
      <div className="flex flex-col gap-2 sketch-box p-4 bg-white -rotate-1 h-auto justify-center">
          <div className="text-center font-bold text-xl mb-2 flex items-center gap-2"><PaintBucket size={20} /> INK</div>
          <div className="grid grid-cols-2 gap-2">
            {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#9ca3af', '#ffffff'].map(c => (
                <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full border-2 border-black hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-black scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                />
            ))}
          </div>
          <div className="w-full h-[2px] bg-black/10 rounded-full my-2"></div>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 cursor-pointer border-2 border-black rounded" />
          {!isHero && (
              <button onClick={() => onDelete(actor.id)} className="mt-4 w-full h-12 sketch-btn text-red-500 hover:bg-red-50">
                  <Trash2 size={24} />
              </button>
          )}
      </div>

    </div>
  );
};
