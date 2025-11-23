import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Eraser, Paintbrush, RotateCcw } from 'lucide-react';

interface IconEditorProps {
     initialIcon?: string;
     onSave: (dataUrl: string) => void;
     onCancel: () => void;
}

const GRID_SIZE = 16;
const PIXEL_SIZE = 20;

export const IconEditor: React.FC<IconEditorProps> = ({ initialIcon, onSave, onCancel }) => {
     const canvasRef = useRef<HTMLCanvasElement>(null);
     const [pixels, setPixels] = useState<string[][]>(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('')));
     const [color, setColor] = useState('#ff0000');
     const [tool, setTool] = useState<'DRAW' | 'ERASE'>('DRAW');

     useEffect(() => {
          if (initialIcon) {
               const img = new Image();
               img.src = initialIcon;
               img.onload = () => {
                    const ctx = document.createElement('canvas').getContext('2d');
                    if (ctx) {
                         ctx.canvas.width = GRID_SIZE;
                         ctx.canvas.height = GRID_SIZE;
                         ctx.drawImage(img, 0, 0);
                         const data = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
                         const newPixels = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
                         for (let y = 0; y < GRID_SIZE; y++) {
                              for (let x = 0; x < GRID_SIZE; x++) {
                                   const i = (y * GRID_SIZE + x) * 4;
                                   if (data[i + 3] > 0) {
                                        newPixels[y][x] = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                                   }
                              }
                         }
                         setPixels(newPixels);
                    }
               };
          } else {
               // Default Heart Shape
               const newPixels = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
               const heart = [
                    "0000000000000000",
                    "0000000000000000",
                    "0001100000110000",
                    "0011110001111000",
                    "0111111011111100",
                    "0111111111111100",
                    "0111111111111100",
                    "0011111111111000",
                    "0001111111110000",
                    "0000111111100000",
                    "0000011111000000",
                    "0000001110000000",
                    "0000000100000000",
                    "0000000000000000",
                    "0000000000000000",
                    "0000000000000000"
               ];
               for (let y = 0; y < GRID_SIZE; y++) {
                    for (let x = 0; x < GRID_SIZE; x++) {
                         if (heart[y][x] === '1') newPixels[y][x] = '#ff0000';
                    }
               }
               setPixels(newPixels);
          }
     }, [initialIcon]);

     const handleCanvasClick = (e: React.MouseEvent) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
          const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
               const newPixels = [...pixels];
               newPixels[y] = [...newPixels[y]];
               newPixels[y][x] = tool === 'DRAW' ? color : '';
               setPixels(newPixels);
          }
     };

     const handleSave = () => {
          const canvas = document.createElement('canvas');
          canvas.width = GRID_SIZE;
          canvas.height = GRID_SIZE;
          const ctx = canvas.getContext('2d');
          if (ctx) {
               pixels.forEach((row, y) => {
                    row.forEach((pixelColor, x) => {
                         if (pixelColor) {
                              ctx.fillStyle = pixelColor;
                              ctx.fillRect(x, y, 1, 1);
                         }
                    });
               });
               onSave(canvas.toDataURL());
          }
     };

     return (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center font-['Gochi_Hand']">
               <div className="bg-white p-6 rounded-2xl shadow-2xl border-4 border-black flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold">Draw Icon</h2>

                    <div className="flex gap-4">
                         <div className="flex flex-col gap-2">
                              <div
                                   className="w-64 h-64 border-2 border-gray-300 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] cursor-crosshair"
                                   style={{ width: GRID_SIZE * PIXEL_SIZE, height: GRID_SIZE * PIXEL_SIZE }}
                              >
                                   <canvas
                                        ref={canvasRef}
                                        width={GRID_SIZE * PIXEL_SIZE}
                                        height={GRID_SIZE * PIXEL_SIZE}
                                        onClick={handleCanvasClick}
                                        onMouseMove={(e) => { if (e.buttons === 1) handleCanvasClick(e); }}
                                   />
                              </div>
                              {/* Render Pixels */}
                              <style>{`
                            canvas {
                                image-rendering: pixelated;
                            }
                        `}</style>
                              {(() => {
                                   if (canvasRef.current) {
                                        const ctx = canvasRef.current.getContext('2d');
                                        if (ctx) {
                                             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                             pixels.forEach((row, y) => {
                                                  row.forEach((pixelColor, x) => {
                                                       if (pixelColor) {
                                                            ctx.fillStyle = pixelColor;
                                                            ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
                                                       }
                                                  });
                                             });
                                             // Grid
                                             ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                                             ctx.lineWidth = 1;
                                             ctx.beginPath();
                                             for (let i = 0; i <= GRID_SIZE; i++) {
                                                  ctx.moveTo(i * PIXEL_SIZE, 0);
                                                  ctx.lineTo(i * PIXEL_SIZE, GRID_SIZE * PIXEL_SIZE);
                                                  ctx.moveTo(0, i * PIXEL_SIZE);
                                                  ctx.lineTo(GRID_SIZE * PIXEL_SIZE, i * PIXEL_SIZE);
                                             }
                                             ctx.stroke();
                                        }
                                   }
                                   return null;
                              })()}
                         </div>

                         <div className="flex flex-col gap-4">
                              <div className="flex gap-2">
                                   <button
                                        onClick={() => setTool('DRAW')}
                                        className={`p-2 rounded-lg border-2 ${tool === 'DRAW' ? 'bg-blue-100 border-blue-500' : 'border-gray-200'}`}
                                   >
                                        <Paintbrush size={24} />
                                   </button>
                                   <button
                                        onClick={() => setTool('ERASE')}
                                        className={`p-2 rounded-lg border-2 ${tool === 'ERASE' ? 'bg-blue-100 border-blue-500' : 'border-gray-200'}`}
                                   >
                                        <Eraser size={24} />
                                   </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                   {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000', '#ffa500'].map(c => (
                                        <button
                                             key={c}
                                             onClick={() => { setColor(c); setTool('DRAW'); }}
                                             className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-black scale-110' : 'border-gray-300'}`}
                                             style={{ backgroundColor: c }}
                                        />
                                   ))}
                              </div>
                         </div>
                    </div>

                    <div className="flex gap-4 mt-4 w-full justify-center">
                         <button onClick={onCancel} className="px-6 py-2 rounded-full border-2 border-gray-300 hover:bg-gray-100 font-bold flex items-center gap-2">
                              <X size={20} /> CANCEL
                         </button>
                         <button onClick={handleSave} className="px-6 py-2 rounded-full bg-green-500 text-white border-2 border-black hover:scale-105 font-bold flex items-center gap-2 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                              <Check size={20} /> SAVE ICON
                         </button>
                    </div>
               </div>
          </div>
     );
};
