import React, { useState, useEffect, useRef } from 'react';
import { Actor } from '../types';
import { CANVAS_SIZE } from '../constants';
import { Trash2, Pencil, Eraser, PaintBucket, RefreshCw, Plus, Copy, Circle, ChevronRight, Film } from 'lucide-react';

interface SpriteEditorProps {
  actor: Actor;
  allActors?: Actor[]; // New prop for list
  selectedActorId?: string; // New prop for selection
  onSelectActor?: (id: string) => void; // New prop
  onAddActor?: () => void; // New prop
  onUpdate: (updatedActor: Actor) => void;
  onDelete: (actorId: string) => void;
  isHero: boolean;
}

export const SpriteEditor: React.FC<SpriteEditorProps> = ({ 
    actor, 
    allActors = [], 
    selectedActorId, 
    onSelectActor, 
    onAddActor,
    onUpdate, 
    onDelete, 
    isHero 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(actor.name);
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState<'PENCIL' | 'ERASER' | 'FILL'>('PENCIL');
  const [brushSize, setBrushSize] = useState<number>(5); 
  const [isDrawing, setIsDrawing] = useState(false);
  
  // UI STATE
  const [showBrushSizes, setShowBrushSizes] = useState(false);
  
  // ANIMATION STATE
  const [frames, setFrames] = useState<string[]>(actor.frames || [actor.imageData]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

  // Initialize state when actor changes
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

  // Render Canvas
  useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        
        // FIXED SIZE 450px
        canvas.style.width = '450px';
        canvas.style.height = '450px';
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
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#fdfbf7]">
        
        {/* MAIN DRAWING AREA (TIGHTLY PACKED) */}
        <div className="flex-1 flex w-full items-center justify-center gap-2 p-4 overflow-hidden min-h-0">
        
            {/* TOOLS LEFT */}
            <div className="flex flex-col gap-3 justify-center shrink-0 relative z-20">
                <div className="flex flex-col gap-2 relative">
                    <div className="relative group">
                        <button onClick={() => setTool('PENCIL')} className={`w-12 h-12 md:w-14 md:h-14 sketch-btn text-2xl ${tool === 'PENCIL' ? 'sketch-btn-active bg-yellow-200' : ''}`}>
                            <Pencil size={24} strokeWidth={2.5} />
                        </button>
                        {tool === 'PENCIL' && (
                            <button onClick={() => setShowBrushSizes(!showBrushSizes)} className="absolute -right-2 -bottom-2 bg-white border-2 border-black rounded-full p-1 hover:bg-gray-100 z-20 shadow-sm">
                                <ChevronRight size={12} className={`transition-transform ${showBrushSizes ? 'rotate-90' : ''}`} />
                            </button>
                        )}
                    </div>
                    {showBrushSizes && tool === 'PENCIL' && (
                        <div className="absolute left-full top-0 ml-2 z-50 bg-white border-2 border-black rounded-lg p-2 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] flex flex-col gap-2 w-12 animate-in fade-in zoom-in duration-200">
                            <button onClick={() => { setBrushSize(2); setShowBrushSizes(false); }} className={`p-1 rounded-full hover:bg-gray-100 flex justify-center ${brushSize === 2 ? 'bg-gray-200 ring-2 ring-black' : ''}`} title="Small"><Circle size={4} fill="black" /></button>
                            <button onClick={() => { setBrushSize(5); setShowBrushSizes(false); }} className={`p-1 rounded-full hover:bg-gray-100 flex justify-center ${brushSize === 5 ? 'bg-gray-200 ring-2 ring-black' : ''}`} title="Medium"><Circle size={8} fill="black" /></button>
                            <button onClick={() => { setBrushSize(10); setShowBrushSizes(false); }} className={`p-1 rounded-full hover:bg-gray-100 flex justify-center ${brushSize === 10 ? 'bg-gray-200 ring-2 ring-black' : ''}`} title="Large"><Circle size={12} fill="black" /></button>
                            <button onClick={() => { setBrushSize(20); setShowBrushSizes(false); }} className={`p-1 rounded-full hover:bg-gray-100 flex justify-center ${brushSize === 20 ? 'bg-gray-200 ring-2 ring-black' : ''}`} title="Huge"><Circle size={16} fill="black" /></button>
                        </div>
                    )}
                    <button onClick={() => setTool('ERASER')} className={`w-12 h-12 md:w-14 md:h-14 sketch-btn text-2xl ${tool === 'ERASER' ? 'sketch-btn-active bg-pink-200' : ''}`}><Eraser size={24} strokeWidth={2.5} /></button>
                    <button onClick={() => setTool('FILL')} className={`w-12 h-12 md:w-14 md:h-14 sketch-btn text-2xl ${tool === 'FILL' ? 'sketch-btn-active bg-blue-200' : ''}`}><PaintBucket size={24} strokeWidth={2.5} /></button>
                </div>
                <div className="h-4 border-b-2 border-black/10"></div>
                <button onClick={clearCanvas} className="w-12 h-12 md:w-14 md:h-14 sketch-btn hover:bg-gray-100"><RefreshCw size={24} strokeWidth={2.5} /></button>
            </div>

            {/* CANVAS CENTER - FIXED 450px */}
            <div className="flex flex-col items-center justify-center">
                <div className="sketch-box p-2 rotate-1 bg-white shadow-xl relative">
                    <div className="absolute top-2 left-2 bg-black/10 px-2 rounded text-xs font-bold text-gray-500 z-10 pointer-events-none">FRAME {currentFrameIdx + 1} / {frames.length}</div>
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className="bg-transparent cursor-crosshair touch-none"
                        style={{ width: '450px', height: '450px', backgroundImage: 'radial-gradient(#e5e7eb 2px, transparent 2px)', backgroundSize: '20px 20px' }}
                    />
                </div>
                <input className="text-center text-4xl mt-2 bg-transparent border-b-4 border-black/20 focus:border-black outline-none font-bold p-1 w-full max-w-[300px]" value={name} onChange={(e) => { setName(e.target.value); onUpdate({...actor, name: e.target.value}) }} />
            </div>

            {/* COLORS RIGHT */}
            <div className="flex flex-col gap-2 sketch-box p-3 bg-white -rotate-1 justify-center shrink-0 z-20">
                <div className="text-center font-bold text-lg mb-1 flex items-center gap-2"><PaintBucket size={18} /> INK</div>
                <div className="grid grid-cols-2 gap-1.5">
                    {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#9ca3af', '#ffffff'].map(c => (
                        <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-black hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-black scale-110' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
                <div className="w-full h-[2px] bg-black/10 rounded-full my-1"></div>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 cursor-pointer border-2 border-black rounded" />
                {!isHero && <button onClick={() => onDelete(actor.id)} className="mt-2 w-full h-10 sketch-btn text-red-500 hover:bg-red-50"><Trash2 size={20} /></button>}
            </div>
        </div>

        {/* UNIFIED BOTTOM BAR (STYLE RESTORED) */}
        <div className="h-32 bg-[#ffbad2] border-t-[4px] border-black flex items-center px-4 gap-0 overflow-hidden shrink-0 z-30 relative shadow-[0px_-4px_15px_rgba(0,0,0,0.1)]">
            
            {/* LEFT: ACTORS LIST */}
            <div className="flex items-center gap-4 overflow-x-auto h-full pr-6 py-2 w-1/2 border-r-[3px] border-black/20">
                
                {/* NEW SPRITE BUTTON - STYLE RESTORED */}
                <button 
                    onClick={onAddActor} 
                    className="h-24 w-24 flex flex-col items-center justify-center bg-white border-[3px] border-black rounded-2xl hover:bg-gray-50 flex-shrink-0 shadow-md transform hover:-rotate-3 transition-transform group"
                >
                    <Plus size={48} className="text-gray-400 group-hover:text-black transition-colors" />
                    <span className="text-sm font-bold text-gray-400 group-hover:text-black">NEW</span>
                </button>

                {/* ACTOR THUMBNAILS - STYLE RESTORED */}
                {allActors.map(a => (
                    <button
                        key={a.id}
                        onClick={() => onSelectActor && onSelectActor(a.id)}
                        className={`
                            relative h-24 w-24 bg-white border-[3px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 overflow-hidden
                            ${selectedActorId === a.id 
                                ? 'border-black shadow-[6px_6px_0px_0px_black] -translate-y-3 rotate-[-2deg] z-10' 
                                : 'border-black/40 hover:border-black hover:-translate-y-1 hover:rotate-1'}
                        `}
                    >
                        <img src={a.imageData} alt={a.name} className="w-full h-full object-contain p-1 pointer-events-none" />
                        {selectedActorId === a.id && (
                            <div className="absolute -top-4 -right-2 bg-yellow-300 text-black text-xs font-bold px-2 py-1 border-2 border-black rounded-full rotate-12 shadow-sm z-20">EDIT</div>
                        )}
                    </button>
                ))}
            </div>

            {/* RIGHT: ANIMATION TIMELINE */}
            <div className="flex items-center gap-4 overflow-x-auto h-full pl-6 py-2 w-1/2 bg-black/5">
                <div className="flex flex-col justify-center items-center mr-2 opacity-30">
                    <Film size={32} className="text-black mb-1" />
                </div>

                {frames.map((frame, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => setCurrentFrameIdx(idx)} 
                        className={`
                            group relative h-20 w-20 bg-white border-4 rounded-xl flex-shrink-0 cursor-pointer transition-transform hover:scale-105 
                            ${currentFrameIdx === idx ? 'border-yellow-400 scale-105 z-10 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-gray-600 opacity-80 hover:opacity-100'}
                        `}
                    >
                        {/* Sprockets visual */}
                        <div className="absolute top-0 left-0 w-full h-1.5 flex justify-between px-1 bg-black"><div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5"></div><div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5"></div><div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5"></div></div>
                        <div className="absolute bottom-0 left-0 w-full h-1.5 flex justify-between px-1 bg-black"><div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5"></div><div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5"></div><div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5"></div></div>
                        
                        <img src={frame} className="w-full h-full object-contain p-1.5 bg-white" />
                        
                        <div className="absolute top-1 right-1 bg-black text-white text-[8px] px-1.5 rounded-full font-mono">{idx + 1}</div>
                        
                        {frames.length > 1 && (
                            <button 
                                onClick={(e) => deleteFrame(e, idx)} 
                                className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all z-50 ${currentFrameIdx === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
                                title="Delete Frame"
                            >
                                <Trash2 size={12} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                ))}
                
                <div className="w-[3px] h-16 bg-black/10 mx-2 rounded-full"></div>
                
                <button onClick={addFrame} className="h-16 w-16 sketch-btn flex flex-col items-center justify-center bg-white border-2 border-black hover:bg-gray-50 text-black/60 hover:text-black">
                    <Plus size={24} />
                    <span className="text-[8px] font-bold mt-1">NEW FRAME</span>
                </button>
                <button onClick={duplicateFrame} className="h-16 w-16 sketch-btn flex flex-col items-center justify-center bg-white border-2 border-black hover:bg-gray-50 text-black/60 hover:text-black">
                    <Copy size={24} />
                    <span className="text-[8px] font-bold mt-1">COPY</span>
                </button>
            </div>

        </div>
    </div>
  );
};