import React, { useState, useEffect, useRef } from 'react';
import { Actor } from '../types';
import { CANVAS_SIZE } from '../constants';
import { Trash2, Pencil, Eraser, PaintBucket, RefreshCw, Plus, Copy, Circle, ChevronRight, Play, Square } from 'lucide-react';

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
  const [brushSize, setBrushSize] = useState<number>(5); // Default Medium
  const [isDrawing, setIsDrawing] = useState(false);
  
  // UI STATE
  const [showBrushSizes, setShowBrushSizes] = useState(false);
  
  // ANIMATION STATE
  const [frames, setFrames] = useState<string[]>(actor.frames || [actor.imageData]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize canvas with High DPI support (User Logic Merged)
  useEffect(() => {
    if(actor.frames && actor.frames.length > 0) {
        setFrames(actor.frames);
        if (currentFrameIdx >= actor.frames.length) setCurrentFrameIdx(0);
    } else {
        setFrames([actor.imageData]);
        setCurrentFrameIdx(0);
    }
    setName(actor.name);
  }, [actor.id]);

  // Load current frame onto canvas
  useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_SIZE * dpr;
        canvas.height = CANVAS_SIZE * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.imageSmoothingEnabled = false;

          const img = new Image();
          img.src = frames[currentFrameIdx] || frames[0]; 
          img.onload = () => {
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
          };
        }
      }
  }, [currentFrameIdx, frames, actor.id]);

  // Preview Animation Loop
  useEffect(() => {
      if (!isPlaying) return;
      const interval = setInterval(() => {
          setCurrentFrameIdx(curr => (curr + 1) % frames.length);
      }, 200); // 5 FPS Preview
      return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  const saveCurrentFrame = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const newImageData = canvas.toDataURL();
      const newFrames = [...frames];
      newFrames[currentFrameIdx] = newImageData;
      setFrames(newFrames);
      
      const mainImage = currentFrameIdx === 0 ? newImageData : actor.imageData;
      onUpdate({ ...actor, name, imageData: mainImage, frames: newFrames });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      saveCurrentFrame();
    }
  };

  // --- FRAME MANAGEMENT ---
  const addFrame = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const blankFrame = canvas.toDataURL();
      
      const newFrames = [...frames, blankFrame];
      setFrames(newFrames);
      setCurrentFrameIdx(newFrames.length - 1);
      onUpdate({ ...actor, frames: newFrames });
  };

  const duplicateFrame = () => {
      const currentData = frames[currentFrameIdx];
      const newFrames = [...frames];
      newFrames.splice(currentFrameIdx + 1, 0, currentData);
      setFrames(newFrames);
      setCurrentFrameIdx(currentFrameIdx + 1);
      onUpdate({ ...actor, frames: newFrames });
  };

  const deleteFrame = (e: React.MouseEvent, idx: number) => {
      e.stopPropagation();
      if (frames.length <= 1) return;
      const newFrames = frames.filter((_, i) => i !== idx);
      setFrames(newFrames);
      if (currentFrameIdx >= newFrames.length) {
          setCurrentFrameIdx(newFrames.length - 1);
      } else if (idx < currentFrameIdx) {
          setCurrentFrameIdx(currentFrameIdx - 1);
      }
      onUpdate({ 
          ...actor, 
          frames: newFrames,
          imageData: idx === 0 ? newFrames[0] : actor.imageData 
      });
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
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const px = Math.floor(startX * dpr);
      const py = Math.floor(startY * dpr);

      if (px < 0 || px >= w || py < 0 || py >= h) return;

      const startPos = (py * w + px) * 4;
      const [startR, startG, startB, startA] = [data[startPos], data[startPos + 1], data[startPos + 2], data[startPos + 3]];
      const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

      if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;

      const tolerance = 50; 
      const colorMatch = (pos: number) => {
          const diff = Math.abs(data[pos] - startR) + Math.abs(data[pos + 1] - startG) + Math.abs(data[pos + 2] - startB) + Math.abs(data[pos + 3] - startA);
          return diff < tolerance;
      };

      const setPixel = (pos: number) => {
          data[pos] = fillR; data[pos + 1] = fillG; data[pos + 2] = fillB; data[pos + 3] = fillA;
      };

      const stack = [[px, py]];
      const seen = new Uint8Array(w * h);

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
      saveCurrentFrame();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'FILL') {
        floodFill(x, y, color);
        setIsDrawing(false);
        return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'ERASER' ? brushSize * 2 : brushSize; 
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
        saveCurrentFrame();
    }
  };

  return (
    <div className="flex w-full h-full bg-[#fdfbf7] overflow-hidden">
        
        {/* --- LEFT COLUMN: ELEMENTS (TOOLS, COLORS, SETTINGS) --- */}
        <div className="w-72 bg-white border-r-[3px] border-black p-4 flex flex-col gap-6 shadow-lg z-20 h-full overflow-y-auto">
            
            {/* Name Input */}
            <div className="sketch-box px-4 py-2 bg-yellow-50">
                <label className="text-xs font-bold text-gray-400">NAME</label>
                <input 
                    className="text-2xl font-bold bg-transparent border-b-2 border-black/10 focus:border-black outline-none w-full" 
                    value={name} 
                    onChange={(e) => { setName(e.target.value); onUpdate({...actor, name: e.target.value}) }} 
                />
            </div>

            {/* Tools */}
            <div className="flex flex-col gap-2">
                <label className="font-bold flex items-center gap-2"><Pencil size={16}/> TOOLS</label>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTool('PENCIL')} className={`h-14 sketch-btn text-2xl ${tool === 'PENCIL' ? 'sketch-btn-active bg-yellow-200' : ''}`}>
                        <Pencil size={24} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setTool('ERASER')} className={`h-14 sketch-btn text-2xl ${tool === 'ERASER' ? 'sketch-btn-active bg-pink-200' : ''}`}>
                        <Eraser size={24} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setTool('FILL')} className={`h-14 sketch-btn text-2xl ${tool === 'FILL' ? 'sketch-btn-active bg-blue-200' : ''}`}>
                        <PaintBucket size={24} strokeWidth={2.5} />
                    </button>
                    <button onClick={clearCanvas} className="h-14 sketch-btn hover:bg-red-100 text-red-500">
                        <RefreshCw size={24} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Brush Size */}
            <div className="flex flex-col gap-2">
                <label className="font-bold text-sm">SIZE: {brushSize}px</label>
                <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg border-2 border-black/10">
                    {[2, 5, 10, 20].map(s => (
                        <button 
                            key={s}
                            onClick={() => setBrushSize(s)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${brushSize === s ? 'bg-black ring-2 ring-offset-2 ring-black' : 'bg-gray-300'}`}
                        >
                            <Circle size={s} fill={brushSize === s ? "white" : "black"} className={brushSize === s ? "text-white" : "text-black"} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Colors */}
            <div className="flex flex-col gap-2">
                <label className="font-bold flex items-center gap-2"><PaintBucket size={16}/> INK</label>
                <div className="grid grid-cols-5 gap-2">
                    {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#9ca3af'].map(c => (
                        <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 border-black hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-black scale-110' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 cursor-pointer border-2 border-black rounded mt-2" />
            </div>

            <div className="flex-1"></div>
            
            {!isHero && (
                <button onClick={() => onDelete(actor.id)} className="w-full h-12 sketch-btn text-red-500 hover:bg-red-100 border-red-500">
                    <Trash2 size={20} className="mr-2"/> DELETE
                </button>
            )}
        </div>

        {/* --- CENTER: CANVAS --- */}
        <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center relative overflow-hidden p-8">
            <div 
                className="sketch-box bg-white shadow-2xl relative flex items-center justify-center transition-transform"
                style={{ 
                    width: 'min(60vh, 60vw)', 
                    height: 'min(60vh, 60vw)',
                }}
            >
                <div className="absolute -top-12 left-0 bg-black text-white px-3 py-1 rounded-t-lg font-bold font-mono">
                    FRAME {currentFrameIdx + 1}/{frames.length}
                </div>
                
                <canvas 
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="bg-transparent cursor-crosshair touch-none w-full h-full object-contain image-pixelated"
                    style={{
                        backgroundImage: 'radial-gradient(#e5e7eb 2px, transparent 2px)',
                        backgroundSize: '20px 20px',
                    }}
                />
            </div>
        </div>

        {/* --- RIGHT COLUMN: ANIMATION --- */}
        <div className="w-40 bg-white border-l-[3px] border-black flex flex-col z-20 h-full shadow-lg">
            <div className="p-4 border-b-2 border-black/10 flex flex-col items-center gap-2">
                <label className="font-bold text-sm flex items-center gap-2">ANIMATION</label>
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-full h-10 sketch-btn flex items-center justify-center gap-2 ${isPlaying ? 'bg-green-300' : 'hover:bg-gray-100'}`}
                >
                    {isPlaying ? <Square size={16} fill="black"/> : <Play size={16} fill="black"/>}
                    <span className="text-xs font-bold">{isPlaying ? 'STOP' : 'PLAY'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 items-center">
                {frames.map((frame, idx) => (
                    <div key={idx} className="flex flex-col items-center relative group w-full">
                        <div 
                            onClick={() => { setIsPlaying(false); setCurrentFrameIdx(idx); }} 
                            className={`w-24 h-24 border-4 rounded-lg cursor-pointer bg-white flex items-center justify-center transition-transform hover:scale-105 ${currentFrameIdx === idx ? 'border-yellow-400 shadow-md scale-105' : 'border-gray-200 hover:border-black'}`}
                        >
                            <img src={frame} className="w-full h-full object-contain p-1" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 mt-1">#{idx + 1}</span>
                        
                        {frames.length > 1 && (
                            <button 
                                onClick={(e) => deleteFrame(e, idx)} 
                                className="absolute top-0 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all border border-black"
                            >
                                <Trash2 size={12}/>
                            </button>
                        )}
                    </div>
                ))}
                
                <div className="w-full h-[2px] bg-gray-200 my-2"></div>

                <button onClick={addFrame} className="w-24 h-16 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-black hover:border-black transition-all shrink-0">
                    <Plus size={24} />
                    <span className="text-[10px] font-bold">NEW FRAME</span>
                </button>
                <button onClick={duplicateFrame} className="w-24 h-12 border-2 border-gray-400 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50 text-gray-400 hover:text-black hover:border-black transition-all shrink-0">
                    <Copy size={16} />
                    <span className="text-[10px] font-bold">COPY</span>
                </button>
            </div>
        </div>

    </div>
  );
};