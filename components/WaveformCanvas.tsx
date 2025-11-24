import React, { useEffect, useRef } from 'react';

interface WaveformCanvasProps {
     audioData: string;
     trimStart: number;
     trimEnd: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ audioData, trimStart, trimEnd }) => {
     const canvasRef = useRef<HTMLCanvasElement>(null);

     useEffect(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const draw = async () => {
               try {
                    const response = await fetch(audioData);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                    const data = audioBuffer.getChannelData(0);
                    const step = Math.ceil(data.length / canvas.width);
                    const amp = canvas.height / 2;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#000';
                    ctx.beginPath();

                    for (let i = 0; i < canvas.width; i++) {
                         let min = 1.0;
                         let max = -1.0;
                         for (let j = 0; j < step; j++) {
                              const datum = data[(i * step) + j];
                              if (datum < min) min = datum;
                              if (datum > max) max = datum;
                         }
                         ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                    }

                    // Draw Trim Lines
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    const startX = trimStart * canvas.width;
                    const endX = trimEnd * canvas.width;

                    // Trimmed out areas
                    ctx.fillRect(0, 0, startX, canvas.height);
                    ctx.fillRect(endX, 0, canvas.width - endX, canvas.height);

                    // Lines
                    ctx.fillStyle = 'red';
                    ctx.fillRect(startX, 0, 2, canvas.height);
                    ctx.fillRect(endX, 0, 2, canvas.height);

               } catch (e) {
                    console.error("Error drawing waveform", e);
               }
          };

          draw();
     }, [audioData, trimStart, trimEnd]);

     return <canvas ref={canvasRef} width={300} height={100} className="w-full h-full" />;
};
