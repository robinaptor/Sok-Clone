import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Save, Trash2, Plus, Music, Mic, Settings, Volume2, Scissors, Clock, Sliders, Copy, Upload, Library, ChevronUp, ChevronDown } from 'lucide-react';
import { WaveformCanvas } from './WaveformCanvas';
import { GameData, MusicTrack, MusicRow, AudioClip, AudioSettings } from '../types';

interface MusicCreatorProps {
     onSave: (track: MusicTrack) => void;
     onCancel: () => void;
     initialTrack?: MusicTrack;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [4, 5]; // 2 Octaves
// const STEPS = 16; // Removed constant

const generateDefaultRows = (): MusicRow[] => {
     const rows: MusicRow[] = [];
     // Default Kit - Pastel Colors
     rows.push({ id: 'kick', name: 'KICK', type: 'SYNTH', note: 'C4', color: 'bg-red-200', volume: 1.0, isMuted: false, instrumentPreset: 'KICK' });
     rows.push({ id: 'snare', name: 'SNARE', type: 'SYNTH', note: 'D4', color: 'bg-blue-200', volume: 1.0, isMuted: false, instrumentPreset: 'SNARE' });
     rows.push({ id: 'hihat', name: 'HIHAT', type: 'SYNTH', note: 'F#4', color: 'bg-yellow-200', volume: 0.8, isMuted: false, instrumentPreset: 'HIHAT' });
     rows.push({ id: 'bass', name: 'BASS', type: 'SYNTH', note: 'A4', color: 'bg-purple-200', volume: 1.0, isMuted: false, instrumentPreset: 'BASS' });
     return rows;
};

const PIANO_NOTES = [
     'C6', 'B5', 'A#5', 'A5', 'G#5', 'G5', 'F#5', 'F5', 'E5', 'D#5', 'D5', 'C#5', 'C5',
     'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4',
     'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3'
];

const PianoRollModal = ({ row, rowIndex, grid, steps, isPlaying, currentStep, onClose, onUpdateNote, playNote, onTogglePlay }: {
     row: MusicRow,
     rowIndex: number,
     grid: number[][],
     steps: number,
     isPlaying: boolean,
     currentStep: number,
     onClose: () => void,
     onUpdateNote: (step: number, note: string) => void,
     playNote: (note: string) => void,
     onTogglePlay: () => void
}) => {

     const [isPainting, setIsPainting] = useState(false);
     const [paintNote, setPaintNote] = useState<string | null>(null);

     const handleMouseDown = (step: number, note: string, isActive: boolean) => {
          setIsPainting(true);
          // If clicking an active note, we are erasing. If inactive, we are drawing.
          // But for simplicity in toggle mode, let's just toggle the first one and set the "intent"
          // Actually, standard paint mode usually draws. Let's try:
          // If we click an empty cell, we start "drawing" (adding notes).
          // If we click an existing note, we start "erasing" (removing notes).
          const isAdding = !isActive;
          setPaintNote(isAdding ? 'ADD' : 'REMOVE');

          if (isActive !== isAdding) { // Should always be true if logic holds
               onUpdateNote(step, note);
               if (isAdding) playNote(note);
          }
     };

     const handleMouseEnter = (step: number, note: string, isActive: boolean) => {
          if (!isPainting || !paintNote) return;

          if (paintNote === 'ADD' && !isActive) {
               onUpdateNote(step, note);
               playNote(note);
          } else if (paintNote === 'REMOVE' && isActive) {
               onUpdateNote(step, note);
          }
     };

     const handleMouseUp = () => {
          setIsPainting(false);
          setPaintNote(null);
     };

     return (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm p-8" onClick={onClose} onMouseUp={handleMouseUp}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden border-4 border-black" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
                         <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full border-2 border-black ${row.color || 'bg-gray-200'}`} />
                              <h2 className="text-2xl font-bold font-['Gochi_Hand']">{row.name} - Melody</h2>

                              {/* Playback Control */}
                              <button
                                   onClick={onTogglePlay}
                                   className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black font-bold transition-all shadow-[2px_2px_0px_black] active:translate-y-[2px] active:shadow-none ${isPlaying ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-green-100 hover:bg-green-200 text-green-600'}`}
                              >
                                   {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                   {isPlaying ? "STOP" : "PLAY"}
                              </button>
                         </div>
                         <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                              <X size={24} />
                         </button>
                    </div>

                    {/* Grid Container */}
                    <div className="flex-1 overflow-auto relative bg-gray-100" onMouseLeave={handleMouseUp}>
                         <div className="flex min-w-max">
                              {/* Piano Keys (Left Sidebar) */}
                              <div className="sticky left-0 z-20 bg-white border-r-2 border-black shadow-md">
                                   {PIANO_NOTES.map(note => (
                                        <div
                                             key={note}
                                             className={`h-8 w-24 flex items-center justify-end pr-2 border-b border-gray-200 text-xs font-bold ${note.includes('#') ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                                             onClick={() => playNote(note)}
                                        >
                                             {note}
                                        </div>
                                   ))}
                              </div>

                              {/* Grid */}
                              <div className="flex-1 relative">
                                   {/* Background Grid */}
                                   <div className="absolute inset-0 pointer-events-none">
                                        {/* Vertical Lines (Steps) */}
                                        <div className="flex h-full">
                                             {Array(steps).fill(null).map((_, step) => (
                                                  <div key={step} className={`flex-1 border-r ${step % 4 === 0 ? 'border-gray-400' : 'border-gray-200'} ${Math.floor(step / 4) % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`} />
                                             ))}
                                        </div>
                                   </div>

                                   {/* Playhead */}
                                   <div
                                        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none transition-all duration-75"
                                        style={{
                                             left: `${(currentStep / steps) * 100}%`,
                                             display: isPlaying ? 'block' : 'none'
                                        }}
                                   />

                                   {/* Rows */}
                                   <div className="flex flex-col">
                                        {PIANO_NOTES.map(note => {
                                             const isBlackKey = note.includes('#');
                                             return (
                                                  <div key={note} className={`flex h-8 border-b ${isBlackKey ? 'bg-gray-100/50' : ''} border-gray-200/50`}>
                                                       {Array(steps).fill(null).map((_, step) => {
                                                            const currentNotes = row.notes?.[step] || [];
                                                            const isActive = currentNotes.includes(note);
                                                            // Check if there is a note in the main grid at this step
                                                            const isDefaultPitch = !row.notes?.[step] && row.note === note && grid[step]?.[rowIndex] > 0;

                                                            return (
                                                                 <div
                                                                      key={step}
                                                                      className={`flex-1 cursor-pointer hover:bg-purple-100 transition-colors border-r border-gray-100/50 relative
                                                                           ${(isActive || isDefaultPitch) ? 'bg-purple-500 !border-purple-600 shadow-sm z-10' : ''}
                                                                      `}
                                                                      onMouseDown={() => handleMouseDown(step, note, !!isActive)}
                                                                      onMouseEnter={() => handleMouseEnter(step, note, !!isActive)}
                                                                 />
                                                            );
                                                       })}
                                                  </div>
                                             );
                                        })}
                                   </div>
                              </div>
                         </div>
                    </div>
               </div>
          </div>
     );
};

export const MusicCreator: React.FC<MusicCreatorProps> = ({ onSave, onCancel, initialTrack }) => {
     const [name, setName] = useState(initialTrack?.name || "New Song");
     const [tempo, setTempo] = useState(120);
     const [steps, setSteps] = useState(initialTrack?.steps || 16);
     const [rows, setRows] = useState<MusicRow[]>(initialTrack?.rows || generateDefaultRows());

     // Initialize grid based on steps
     const [grid, setGrid] = useState<number[][]>(() => {
          const initialGrid = Array(steps).fill(null).map(() => Array(rows.length).fill(0));
          if (initialTrack?.sequence) {
               initialTrack.sequence.forEach(item => {
                    if (item.time < steps && item.note < rows.length) {
                         initialGrid[item.time][item.note] = item.duration || 1;
                    }
               });
          }
          return initialGrid;
     });

     const [isPlaying, setIsPlaying] = useState(false);
     const [currentStep, setCurrentStep] = useState(0);
     const [soloRowId, setSoloRowId] = useState<string | null>(null);

     // Instrument Editor State
     const [editingRowId, setEditingRowId] = useState<string | null>(null);
     const [isRecording, setIsRecording] = useState(false);

     // Paint Mode State (Main Grid)
     const [isDrawing, setIsDrawing] = useState(false);
     const [drawMode, setDrawMode] = useState<'ADD' | 'REMOVE' | null>(null);

     const handleGridMouseDown = (step: number, rowIndex: number, isActive: boolean) => {
          setIsDrawing(true);
          const mode = isActive ? 'REMOVE' : 'ADD';
          setDrawMode(mode);

          const newGrid = [...grid];
          newGrid[step][rowIndex] = mode === 'ADD' ? 1 : 0;
          setGrid(newGrid);

          if (mode === 'ADD') {
               playRowSound(rowIndex, audioCtxRef.current?.currentTime || 0);
          }
     };

     const handleGridMouseEnter = (step: number, rowIndex: number, isActive: boolean) => {
          if (!isDrawing || !drawMode) return;

          if (drawMode === 'ADD' && !isActive) {
               const newGrid = [...grid];
               newGrid[step][rowIndex] = 1;
               setGrid(newGrid);
               playRowSound(rowIndex, audioCtxRef.current?.currentTime || 0);
          } else if (drawMode === 'REMOVE' && isActive) {
               const newGrid = [...grid];
               newGrid[step][rowIndex] = 0;
               setGrid(newGrid);
          }
     };

     const handleGridMouseUp = () => {
          setIsDrawing(false);
          setDrawMode(null);
     };
     const mediaRecorderRef = useRef<MediaRecorder | null>(null);
     const chunksRef = useRef<BlobPart[]>([]);

     const audioCtxRef = useRef<AudioContext | null>(null);
     const nextNoteTimeRef = useRef(0);
     const timerIDRef = useRef<number | null>(null);
     const stepRef = useRef(0);
     const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

     // Resizing State
     const [resizingNote, setResizingNote] = useState<{ step: number, row: number } | null>(null);

     // Piano Roll State
     const [pianoRollRowId, setPianoRollRowId] = useState<string | null>(null);

     // Audio Clip Interaction State
     const [draggingClip, setDraggingClip] = useState<{ clipId: string, rowId: string, startX: number, originalStartStep: number } | null>(null);
     const [resizingClip, setResizingClip] = useState<{ clipId: string, rowId: string, startX: number, originalDuration: number } | null>(null);
     const [resizingClipStart, setResizingClipStart] = useState<{ clipId: string, rowId: string, startX: number, originalStartStep: number, originalDuration: number, originalOffset: number } | null>(null);

     useEffect(() => {
          const handleMouseUp = () => {
               if (resizingNote) setResizingNote(null);
               if (draggingClip) setDraggingClip(null);
               if (resizingClip) setResizingClip(null);
               if (resizingClipStart) setResizingClipStart(null);
          };
          window.addEventListener('mouseup', handleMouseUp);
          return () => window.removeEventListener('mouseup', handleMouseUp);
     }, [resizingNote, draggingClip, resizingClip, resizingClipStart]);

     // Handle Clip Dragging & Resizing
     useEffect(() => {
          const handleMouseMove = (e: MouseEvent) => {
               if (!sequencerGridRef.current) return;

               // Calculate grid metrics (same as resizingNote logic)
               const gridRect = sequencerGridRef.current.getBoundingClientRect();
               const totalRems = steps * 4.25 + 0.75;
               const pixelsPerRem = gridRect.width / totalRems;
               const stepWidth = 4.25 * pixelsPerRem;

               if (draggingClip) {
                    const deltaX = e.clientX - draggingClip.startX;
                    const deltaSteps = deltaX / stepWidth;

                    // Update Clip Start Step
                    const newStartStep = Math.max(0, draggingClip.originalStartStep + deltaSteps);

                    // Snap to nearest 0.25 step (16th note)
                    const snappedStartStep = Math.round(newStartStep * 4) / 4;

                    updateRow(draggingClip.rowId, {
                         audioClips: rows.find(r => r.id === draggingClip.rowId)?.audioClips?.map(c =>
                              c.id === draggingClip.clipId ? { ...c, startStep: snappedStartStep } : c
                         )
                    });
               }

               if (resizingClip) {
                    const deltaX = e.clientX - resizingClip.startX;
                    const deltaSteps = deltaX / stepWidth;

                    // Update Clip Duration
                    const newDuration = Math.max(0.25, resizingClip.originalDuration + deltaSteps);

                    // Snap
                    const snappedDuration = Math.round(newDuration * 4) / 4;

                    updateRow(resizingClip.rowId, {
                         audioClips: rows.find(r => r.id === resizingClip.rowId)?.audioClips?.map(c =>
                              c.id === resizingClip.clipId ? { ...c, durationSteps: snappedDuration } : c
                         )
                    });
               }

               if (resizingClipStart) {
                    const deltaX = e.clientX - resizingClipStart.startX;
                    const deltaSteps = deltaX / stepWidth;

                    // Calculate new start step
                    // If delta is positive (drag right), start moves right, duration decreases
                    // If delta is negative (drag left), start moves left, duration increases

                    // Constraint: Start cannot be < 0
                    let newStartStep = resizingClipStart.originalStartStep + deltaSteps;

                    // Constraint: Duration cannot be < 0.25
                    // New Duration = Original Duration - Delta
                    let newDuration = resizingClipStart.originalDuration - deltaSteps;

                    // Constraint: Offset cannot be < 0
                    // New Offset = Original Offset + (Delta * StepDurationInSeconds)
                    const secondsPerBeat = 60.0 / tempo;
                    const stepDurationSeconds = 0.25 * secondsPerBeat;
                    let newOffset = resizingClipStart.originalOffset + (deltaSteps * stepDurationSeconds);

                    // Apply constraints
                    if (newOffset < 0) {
                         // Clamped by offset (can't go before start of sample)
                         // deltaSteps must be >= -originalOffset / stepDurationSeconds
                         const minDelta = -resizingClipStart.originalOffset / stepDurationSeconds;
                         if (deltaSteps < minDelta) {
                              // Clamp to minDelta
                              const clampedDelta = minDelta;
                              newStartStep = resizingClipStart.originalStartStep + clampedDelta;
                              newDuration = resizingClipStart.originalDuration - clampedDelta;
                              newOffset = 0;
                         }
                    }

                    if (newDuration < 0.25) {
                         // Clamped by min duration
                         // deltaSteps must be <= originalDuration - 0.25
                         const maxDelta = resizingClipStart.originalDuration - 0.25;
                         if (deltaSteps > maxDelta) {
                              const clampedDelta = maxDelta;
                              newStartStep = resizingClipStart.originalStartStep + clampedDelta;
                              newDuration = resizingClipStart.originalDuration - clampedDelta;
                              newOffset = resizingClipStart.originalOffset + (clampedDelta * stepDurationSeconds);
                         }
                    }

                    if (newStartStep < 0) {
                         // Clamped by start of grid
                         newStartStep = 0;
                         // If we hit start 0, we can still extend duration if we have offset?
                         // No, if start is 0, we can't move start left.
                         // But we CAN move start right (trim).
                         // So this clamp is only for dragging left.
                         // If dragging left implies start < 0, we stop.
                         // But wait, if we drag left, we are REVEALING audio (decreasing offset).
                         // If we are at start 0, we can't move the clip left.
                         // So yes, startStep >= 0.
                    }

                    // Snap
                    const snappedStartStep = Math.round(newStartStep * 4) / 4;
                    const snappedDuration = Math.round(newDuration * 4) / 4;

                    // Recalculate offset based on snapped values to avoid drift?
                    // Or just use the calculated offset?
                    // Let's use the calculated offset but maybe snap it too?
                    // Actually, offset is in seconds.
                    // Let's just use the derived offset from the snapped steps difference.
                    // Delta = NewStart - OriginalStart
                    const finalDelta = snappedStartStep - resizingClipStart.originalStartStep;
                    const finalOffset = Math.max(0, resizingClipStart.originalOffset + (finalDelta * stepDurationSeconds));

                    updateRow(resizingClipStart.rowId, {
                         audioClips: rows.find(r => r.id === resizingClipStart.rowId)?.audioClips?.map(c =>
                              c.id === resizingClipStart.clipId ? {
                                   ...c,
                                   startStep: snappedStartStep,
                                   durationSteps: snappedDuration,
                                   offset: finalOffset
                              } : c
                         )
                    });
               }
          };

          if (draggingClip || resizingClip || resizingClipStart) {
               window.addEventListener('mousemove', handleMouseMove);
          }
          return () => window.removeEventListener('mousemove', handleMouseMove);
     }, [draggingClip, resizingClip, resizingClipStart, rows, steps, tempo]);

     useEffect(() => {
          const row = rows.find(r => r.id === editingRowId);
          if (row?.type === 'SAMPLE' && row.sampleData && waveformCanvasRef.current) {
               const canvas = waveformCanvasRef.current;
               const ctx = canvas.getContext('2d');
               if (!ctx) return;

               fetch(row.sampleData)
                    .then(res => res.arrayBuffer())
                    .then(buffer => new AudioContext().decodeAudioData(buffer))
                    .then(audioBuffer => {
                         const data = audioBuffer.getChannelData(0);
                         const step = Math.ceil(data.length / canvas.width);
                         const amp = canvas.height / 2;

                         ctx.clearRect(0, 0, canvas.width, canvas.height);
                         ctx.fillStyle = '#f3f4f6';
                         ctx.fillRect(0, 0, canvas.width, canvas.height);

                         ctx.beginPath();
                         ctx.strokeStyle = '#000000';
                         ctx.lineWidth = 1;

                         for (let i = 0; i < canvas.width; i++) {
                              let min = 1.0;
                              let max = -1.0;
                              for (let j = 0; j < step; j++) {
                                   const datum = data[(i * step) + j];
                                   if (datum < min) min = datum;
                                   if (datum > max) max = datum;
                              }
                              ctx.moveTo(i, (1 + min) * amp);
                              ctx.lineTo(i, (1 + max) * amp);
                         }
                         ctx.stroke();
                    })
                    .catch(e => console.error("Error decoding audio for waveform", e));
          }
     }, [editingRowId, rows]);

     useEffect(() => {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          return () => {
               if (audioCtxRef.current) audioCtxRef.current.close();
          };
     }, []);

     // Sync grid size with rows
     useEffect(() => {
          setGrid(prevGrid => {
               return prevGrid.map(stepNotes => {
                    if (stepNotes.length === rows.length) return stepNotes;
                    const newStepNotes = Array(rows.length).fill(0);
                    stepNotes.forEach((duration, i) => {
                         if (i < newStepNotes.length) newStepNotes[i] = duration;
                    });
                    return newStepNotes;
               });
          });
     }, [rows.length]);

     const getFrequency = (noteName: string) => {
          const note = noteName.slice(0, -1);
          const octave = parseInt(noteName.slice(-1));
          const noteIndex = NOTES.indexOf(note);
          const semitonesFromA4 = (noteIndex - 9) + (octave - 4) * 12;
          return 440 * Math.pow(2, semitonesFromA4 / 12);
     };

     const createReverbImpulse = (duration: number, decay: number, ctx: AudioContext) => {
          const rate = ctx.sampleRate;
          const length = rate * duration;
          const impulse = ctx.createBuffer(2, length, rate);
          const left = impulse.getChannelData(0);
          const right = impulse.getChannelData(1);

          for (let i = 0; i < length; i++) {
               const n = i;
               left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
               right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
          }
          return impulse;
     };

     const playRowSound = (rowIndex: number, time: number, durationInSteps: number = 1, noteOverride?: string | string[]) => {
          if (!audioCtxRef.current) return;
          const ctx = audioCtxRef.current;
          const row = rows[rowIndex];

          // Mute/Solo Logic
          if (row.isMuted && soloRowId !== row.id) return;
          if (soloRowId && soloRowId !== row.id) return;

          const volume = row.volume ?? 1.0;

          // Calculate duration in seconds
          const secondsPerBeat = 60.0 / tempo;
          const stepDuration = 0.25 * secondsPerBeat; // 16th note
          const noteDuration = durationInSteps * stepDuration;

          // Normalize noteOverride to array
          const notesToPlay = Array.isArray(noteOverride) ? noteOverride : (noteOverride ? [noteOverride] : [row.note || 'C4']);

          notesToPlay.forEach(noteToPlay => {
               // ADSR
               const adsr = row.adsr || { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };
               const attack = Math.max(0.001, adsr.attack); // Prevent 0 attack
               const decay = Math.max(0.001, adsr.decay);
               const sustain = Math.max(0, Math.min(1, adsr.sustain));
               const release = Math.max(0.001, adsr.release);

               // Master Gain for this note
               const gain = ctx.createGain();
               gain.connect(ctx.destination);

               // Apply ADSR Envelope
               gain.gain.setValueAtTime(0, time);
               gain.gain.linearRampToValueAtTime(volume, time + attack);
               gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * sustain), time + attack + decay);
               gain.gain.setValueAtTime(Math.max(0.001, volume * sustain), time + noteDuration);
               gain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration + release);

               // FX Chain
               const fxInput = ctx.createGain();
               fxInput.connect(gain);

               // Delay
               if (row.fx?.delay) {
                    const delay = ctx.createDelay();
                    delay.delayTime.value = 0.3; // 300ms delay
                    const feedback = ctx.createGain();
                    feedback.gain.value = 0.4;

                    const delayGain = ctx.createGain();
                    delayGain.gain.value = 0.5; // Wet mix

                    fxInput.connect(delay);
                    delay.connect(feedback);
                    feedback.connect(delay);
                    delay.connect(delayGain);
                    delayGain.connect(gain);
               }

               // Reverb
               if (row.fx?.reverb) {
                    const convolver = ctx.createConvolver();
                    convolver.buffer = createReverbImpulse(2.0, 2.0, ctx); // 2s reverb

                    const reverbGain = ctx.createGain();
                    reverbGain.gain.value = 0.5; // Wet mix

                    fxInput.connect(convolver);
                    convolver.connect(reverbGain);
                    reverbGain.connect(gain);
               }

               if (row.type === 'SAMPLE' && row.sampleData) {
                    fetch(row.sampleData)
                         .then(res => res.arrayBuffer())
                         .then(buffer => ctx.decodeAudioData(buffer))
                         .then(audioBuffer => {
                              const source = ctx.createBufferSource();
                              source.buffer = audioBuffer;

                              source.connect(fxInput);

                              const duration = audioBuffer.duration;
                              const startOffset = (row.trimStart || 0) * duration;
                              const endOffset = (row.trimEnd || 1) * duration;
                              const sampleDuration = Math.max(0.001, endOffset - startOffset);

                              // Pitch Shifting Logic for Samples
                              let playbackRate = 1.0;

                              // If noteOverride is present (Melody/Piano Roll), use Pitch Shifting
                              if (noteOverride && (Array.isArray(noteOverride) ? noteOverride.length > 0 : true)) {
                                   // Calculate frequency ratio relative to C4 (Base note for samples)
                                   const targetFreq = getFrequency(noteToPlay);
                                   const baseFreq = getFrequency('C4');
                                   playbackRate = targetFreq / baseFreq;
                              } else {
                                   // No melody note (Main Grid) -> Stretch to fit duration (Varispeed)
                                   // If sample is 1s and note is 2s, we want rate 0.5
                                   playbackRate = sampleDuration / noteDuration;
                              }

                              source.playbackRate.value = playbackRate;

                              source.start(time, startOffset, noteDuration + release);
                         })
                         .catch(e => console.error("Error playing sample", e));

               } else if (row.type === 'SYNTH') {
                    if (row.instrumentPreset === 'KICK' || row.instrumentPreset === 'SNARE' || row.instrumentPreset === 'HIHAT') {
                         // PRESETS (Kick, Snare, HiHat) - Re-using original logic but routed to fxInput
                         // We need to bypass the master ADSR for drums because they have their own tight envelopes?
                         // Or we can just set the master ADSR to be "open" for drums?
                         // Let's just re-paste the drum logic and route to fxInput.

                         if (row.instrumentPreset === 'KICK') {
                              // Complex Kick: Body + Click
                              const osc = ctx.createOscillator();
                              const gain = ctx.createGain();
                              osc.connect(gain);
                              gain.connect(fxInput);

                              // Body
                              osc.frequency.setValueAtTime(150, time);
                              osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
                              gain.gain.setValueAtTime(1.0, time);
                              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

                              osc.start(time);
                              osc.stop(time + 0.5);

                              // Click (Transient)
                              const clickOsc = ctx.createOscillator();
                              const clickGain = ctx.createGain();
                              clickOsc.connect(clickGain);
                              clickGain.connect(fxInput);

                              clickOsc.frequency.setValueAtTime(3000, time);
                              clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);
                              clickGain.gain.setValueAtTime(0.5, time);
                              clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

                              clickOsc.start(time);
                              clickOsc.stop(time + 0.02);

                         } else if (row.instrumentPreset === 'SNARE') {
                              // Complex Snare: Noise + Tonal Body
                              const noise = ctx.createBufferSource();
                              const bufferSize = ctx.sampleRate;
                              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                              const data = buffer.getChannelData(0);
                              for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                              noise.buffer = buffer;

                              const noiseFilter = ctx.createBiquadFilter();
                              noiseFilter.type = 'highpass';
                              noiseFilter.frequency.value = 1000;
                              noise.connect(noiseFilter);

                              const noiseGain = ctx.createGain();
                              noiseFilter.connect(noiseGain);
                              noiseGain.connect(fxInput);

                              // Tonal Body
                              const osc = ctx.createOscillator();
                              const oscGain = ctx.createGain();
                              osc.type = 'triangle';
                              osc.connect(oscGain);
                              oscGain.connect(fxInput);

                              // Envelopes
                              noiseGain.gain.setValueAtTime(1, time);
                              noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

                              osc.frequency.setValueAtTime(250, time);
                              osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
                              oscGain.gain.setValueAtTime(0.5, time);
                              oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

                              noise.start(time);
                              osc.start(time);
                              noise.stop(time + 0.2);
                              osc.stop(time + 0.2);

                         } else if (row.instrumentPreset === 'HIHAT') {
                              // Metallic HiHat: Highpass filtered noise + Bandpass
                              const bufferSize = ctx.sampleRate;
                              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                              const data = buffer.getChannelData(0);
                              for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }

                              const noise = ctx.createBufferSource();
                              noise.buffer = buffer;

                              // Bandpass for metallic ring
                              const bandpass = ctx.createBiquadFilter();
                              bandpass.type = 'bandpass';
                              bandpass.frequency.value = 10000;
                              bandpass.Q.value = 1;

                              // Highpass for crispness
                              const highpass = ctx.createBiquadFilter();
                              highpass.type = 'highpass';
                              highpass.frequency.value = 7000;

                              const gain = ctx.createGain();

                              noise.connect(bandpass);
                              bandpass.connect(highpass);
                              highpass.connect(gain);
                              gain.connect(fxInput);

                              gain.gain.setValueAtTime(0.6, time);
                              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

                              noise.start(time);
                              noise.stop(time + 0.05);
                         }
                    } else if (row.instrumentPreset === 'GUITAR') {
                         // Guitar Pluck Synthesis
                         const osc = ctx.createOscillator();
                         osc.connect(fxInput);
                         osc.frequency.value = getFrequency(noteToPlay);
                         osc.type = 'sawtooth'; // Sawtooth rich in harmonics

                         // Lowpass Filter for "pluck" damping
                         const filter = ctx.createBiquadFilter();
                         filter.type = 'lowpass';
                         filter.frequency.setValueAtTime(3000, time);
                         filter.frequency.exponentialRampToValueAtTime(500, time + 0.2); // Filter closes quickly

                         osc.disconnect();
                         osc.connect(filter);
                         filter.connect(fxInput);

                         osc.start(time);
                         osc.stop(time + noteDuration + release);
                    } else if (row.instrumentPreset === 'PIANO') {
                         // Basic Piano Synthesis (Sine + Harmonics)
                         const osc = ctx.createOscillator();
                         osc.connect(fxInput);
                         osc.frequency.value = getFrequency(noteToPlay);
                         osc.type = 'triangle'; // Triangle is softer than square/saw

                         osc.start(time);
                         osc.stop(time + noteDuration + release);
                    } else {
                         // Default Synth
                         const osc = ctx.createOscillator();
                         osc.connect(fxInput);
                         osc.frequency.value = getFrequency(noteToPlay);
                         osc.type = row.waveform || 'square';
                         osc.start(time);
                         osc.stop(time + noteDuration + release);
                    }
               }
          });
     };

     const scheduler = () => {
          if (!audioCtxRef.current) return;
          while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
               scheduleNote(stepRef.current, nextNoteTimeRef.current);
               nextNoteTime();
          }
          timerIDRef.current = window.setTimeout(scheduler, 25);
     };

     const nextNoteTime = () => {
          const secondsPerBeat = 60.0 / tempo;
          nextNoteTimeRef.current += 0.25 * secondsPerBeat; // 16th notes
          stepRef.current = (stepRef.current + 1) % steps;
          setCurrentStep(stepRef.current);
     };

     const playAudioClip = (row: MusicRow, clip: AudioClip, startTime: number) => {
          if (!audioCtxRef.current || !row.sampleData) return;
          const ctx = audioCtxRef.current;

          // Mute/Solo Check
          if (row.isMuted && soloRowId !== row.id) return;
          if (soloRowId && soloRowId !== row.id) return;

          fetch(row.sampleData)
               .then(res => res.arrayBuffer())
               .then(buffer => ctx.decodeAudioData(buffer))
               .then(audioBuffer => {
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;

                    // Advanced Settings
                    const settings: AudioSettings = row.audioSettings || {
                         pitch: 0,
                         playbackRate: 1.0,
                         volume: 1.0,
                         trimStart: 0,
                         trimEnd: 0,
                         eq: { high: 0, mid: 0, low: 0 }
                    };
                    const playbackRate = settings.playbackRate || 1.0;
                    const pitchShift = settings.pitch || 0; // Semitones

                    // Calculate final playback rate combining speed and pitch
                    // Speed affects pitch, so if we want independent pitch shifting we need a complex algorithm (Phase Vocoder).
                    // But usually "Playback Speed" in simple samplers implies pitch change too (Varispeed).
                    // The user asked for "Pitch" AND "Vitesse" separately?
                    // "modifier présisément le Trim, les égue, les grave, le pitch, la vitesse"
                    // If they are separate, we need a PitchShifterNode (not native).
                    // For now, let's assume Varispeed (Speed = Pitch).
                    // If they want Pitch *Correction* (Semitones) without speed change, that's hard.
                    // But maybe they mean "Tune" (which changes speed).
                    // Let's combine them: Rate = Speed * (2 ^ (Pitch/12))

                    const finalRate = playbackRate * Math.pow(2, pitchShift / 12);
                    source.playbackRate.value = finalRate;

                    // Looping
                    // If the clip duration is longer than the sample *adjusted for rate*, we loop.
                    // Actually, we can just set loop=true and let stop() handle the cut.
                    source.loop = true;

                    // FX Chain (EQ -> Volume)
                    const eqHigh = ctx.createBiquadFilter();
                    eqHigh.type = 'highshelf';
                    eqHigh.frequency.value = 3000;
                    eqHigh.gain.value = settings.eq?.high || 0;

                    const eqMid = ctx.createBiquadFilter();
                    eqMid.type = 'peaking';
                    eqMid.frequency.value = 1000;
                    eqMid.gain.value = settings.eq?.mid || 0;

                    const eqLow = ctx.createBiquadFilter();
                    eqLow.type = 'lowshelf';
                    eqLow.frequency.value = 250;
                    eqLow.gain.value = settings.eq?.low || 0;

                    const gain = ctx.createGain();
                    gain.gain.value = row.volume ?? 1.0;

                    source.connect(eqLow);
                    eqLow.connect(eqMid);
                    eqMid.connect(eqHigh);
                    eqHigh.connect(gain);
                    gain.connect(ctx.destination);

                    // Calculate Duration in Seconds
                    const secondsPerBeat = 60.0 / tempo;
                    const stepDuration = 0.25 * secondsPerBeat;
                    const playDuration = clip.durationSteps * stepDuration;

                    // Start
                    source.start(startTime, clip.offset || 0, playDuration);
               })
               .catch(e => console.error("Error playing clip", e));
     };

     const scheduleNote = (stepNumber: number, time: number) => {
          // 1. Standard Grid Notes
          if (grid[stepNumber]) {
               grid[stepNumber].forEach((duration, rowIndex) => {
                    if (duration > 0) {
                         const row = rows[rowIndex];
                         if (row.type !== 'AUDIO') {
                              const melodyNotes = row.notes?.[stepNumber];
                              playRowSound(rowIndex, time, duration, melodyNotes);
                         }
                    }
               });
          }

          // 2. Audio Clips (Sub-step scheduling)
          rows.forEach(row => {
               if (row.type === 'AUDIO' && row.audioClips) {
                    row.audioClips.forEach(clip => {
                         // Check if clip starts in this step window [stepNumber, stepNumber + 1)
                         if (clip.startStep >= stepNumber && clip.startStep < stepNumber + 1) {
                              const secondsPerBeat = 60.0 / tempo;
                              const stepDuration = 0.25 * secondsPerBeat;
                              const offsetSteps = clip.startStep - stepNumber;
                              const exactTime = time + (offsetSteps * stepDuration);

                              playAudioClip(row, clip, exactTime);
                         }
                    });
               }
          });
     };

     const togglePlay = () => {
          if (isPlaying) {
               setIsPlaying(false);
               if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
          } else {
               if (!audioCtxRef.current) return;
               if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
               setIsPlaying(true);
               stepRef.current = 0;
               setCurrentStep(0);
               nextNoteTimeRef.current = audioCtxRef.current.currentTime;
               scheduler();
          }
     };

     const handleSave = () => {
          const sequence: { note: number, time: number, duration: number }[] = [];
          grid.forEach((stepRows, time) => {
               stepRows.forEach((duration, rowIndex) => {
                    if (duration > 0) {
                         sequence.push({ note: rowIndex, time, duration });
                    }
               });
          });

          const track: MusicTrack = {
               id: initialTrack?.id || Math.random().toString(36).substr(2, 9),
               name: name || 'New Track',
               type: 'GENERATED',
               data: '',
               sequence,
               rows,
               steps,
               tempo
          };
          onSave(track);
     };

     // --- Recording Logic ---
     const startRecording = async () => {
          try {
               const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
               const mediaRecorder = new MediaRecorder(stream);
               mediaRecorderRef.current = mediaRecorder;
               chunksRef.current = [];

               mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
               };

               mediaRecorder.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                         const base64 = reader.result as string;
                         if (editingRowId) {
                              const row = rows.find(r => r.id === editingRowId);

                              if (row?.type === 'AUDIO') {
                                   // Calculate duration in steps
                                   const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                   const arrayBuffer = await (await fetch(base64)).arrayBuffer();
                                   const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                                   const durationSeconds = audioBuffer.duration;
                                   const secondsPerBeat = 60.0 / tempo;
                                   const stepDuration = 0.25 * secondsPerBeat;
                                   const durationSteps = durationSeconds / stepDuration;

                                   // Create new clip
                                   const newClip: AudioClip = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        startStep: 0, // Start at beginning
                                        durationSteps: durationSteps,
                                        offset: 0,
                                        isLooping: false,
                                        originalDurationSteps: durationSteps
                                   };

                                   setRows(prev => prev.map(r => r.id === editingRowId ? {
                                        ...r,
                                        sampleData: base64,
                                        audioClips: [...(r.audioClips || []), newClip]
                                   } : r));

                              } else {
                                   // Standard Sample Row
                                   setRows(prev => prev.map(r => r.id === editingRowId ? { ...r, sampleData: base64, trimStart: 0, trimEnd: 1 } : r));
                              }
                         }
                    };
                    reader.readAsDataURL(blob);
                    stream.getTracks().forEach(track => track.stop());
               };

               mediaRecorder.start();
               setIsRecording(true);
          } catch (err) {
               console.error("Error accessing microphone:", err);
               alert("Could not access microphone. Please ensure you have granted permission.");
          }
     };

     const stopRecording = () => {
          if (mediaRecorderRef.current && isRecording) {
               mediaRecorderRef.current.stop();
               setIsRecording(false);
          }
     };

     // --- Sample Library ---
     const [isLibraryOpen, setIsLibraryOpen] = useState(false);
     const [librarySamples, setLibrarySamples] = useState<{ id: string, name: string, data: string }[]>([]);

     const addToLibrary = (name: string, data: string) => {
          setLibrarySamples(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, data }]);
     };

     const addNewRow = () => {
          const newRow: MusicRow = {
               id: Math.random().toString(36).substr(2, 9),
               name: 'New Track',
               type: 'SYNTH',
               note: 'C4',
               color: 'bg-gray-200',
               volume: 1.0,
               isMuted: false,

          };
          setRows(prev => [...prev, newRow]);
     };

     const deleteRow = (id: string) => {
          if (confirm("Delete this track?")) {
               const index = rows.findIndex(r => r.id === id);
               setRows(prev => prev.filter(r => r.id !== id));
               setGrid(prev => prev.map(step => {
                    const newStep = [...step];
                    newStep.splice(index, 1);
                    return newStep;
               }));
          }
     };

     const updateRow = (id: string, updates: Partial<MusicRow>) => {
          setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
     };

     const duplicateClip = (rowId: string, clipId: string) => {
          setRows(prev => prev.map(r => {
               if (r.id !== rowId || !r.audioClips) return r;
               const clip = r.audioClips.find(c => c.id === clipId);
               if (!clip) return r;

               const newClip: AudioClip = {
                    ...clip,
                    id: Math.random().toString(36).substr(2, 9),
                    startStep: clip.startStep + clip.durationSteps, // Place after
               };

               return { ...r, audioClips: [...r.audioClips, newClip] };
          }));
     };

     const deleteClip = (rowId: string, clipId: string) => {
          setRows(prev => prev.map(r => {
               if (r.id !== rowId || !r.audioClips) return r;
               return { ...r, audioClips: r.audioClips.filter(c => c.id !== clipId) };
          }));
     };

     const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, rowId: string) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
               const base64 = event.target?.result as string;
               const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
               const arrayBuffer = await (await fetch(base64)).arrayBuffer();
               const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

               const durationSeconds = audioBuffer.duration;
               const secondsPerBeat = 60.0 / tempo;
               const stepDuration = 0.25 * secondsPerBeat;
               const durationSteps = durationSeconds / stepDuration;

               const newClip: AudioClip = {
                    id: Math.random().toString(36).substr(2, 9),
                    startStep: 0,
                    durationSteps: durationSteps,
                    offset: 0,
                    isLooping: false,
                    originalDurationSteps: durationSteps // Store original duration for looping
               } as any;

               setRows(prev => prev.map(r => r.id === rowId ? {
                    ...r,
                    sampleData: base64,
                    audioClips: [...(r.audioClips || []), newClip]
               } : r));

               // Add to library if not already present (simple check by name? or just always add?)
               // Let's just add it for now, maybe user wants duplicates or we can check content hash later.
               // Use file name if available, else "Uploaded Sample"
               addToLibrary(file.name || "Uploaded Sample", base64);
          };
          reader.readAsDataURL(file);
     };

     // Ensure uploaded samples go to library
     useEffect(() => {
          rows.forEach(row => {
               if (row.sampleData) {
                    // Check if already in library
                    const exists = librarySamples.some(s => s.data === row.sampleData);
                    if (!exists) {
                         addToLibrary(row.name || "Sample", row.sampleData);
                    }
               }
          });
     }, [rows]);

     const editingRow = rows.find(r => r.id === editingRowId);

     const pianoRollRow = rows.find(r => r.id === pianoRollRowId);
     const pianoRollRowIndex = rows.findIndex(r => r.id === pianoRollRowId);

     const sequencerGridRef = useRef<HTMLDivElement>(null); // Add this ref
     const ignoreClickRef = useRef(false);

     return (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center font-['Gochi_Hand'] backdrop-blur-sm p-4"
               onMouseMove={(e) => {
                    if (resizingNote && sequencerGridRef.current) {
                         const { step: originalStep, row: rowIndex } = resizingNote;
                         const gridRect = sequencerGridRef.current.getBoundingClientRect();

                         // The grid rows have p-2 (0.5rem) padding.
                         // We need to account for this to get the correct step index.
                         // We can approximate 1rem = 16px, or measure it.
                         // Since we don't have the row ref, we'll estimate padding based on the known class 'p-2'.
                         // p-2 is usually 0.5rem. If root is 16px, that's 8px.
                         // Total horizontal padding is 1rem (16px).

                         // However, to be robust against zoom/font-size, we can try to derive it.
                         // But for now, let's assume standard behavior or use a ratio.

                         // Better yet: The step width is uniform.
                         // Total Width = (16 * StepWidth) + Padding
                         // StepWidth = (TotalWidth - Padding) / 16

                         // Let's try to calculate pixels per rem from the grid width?
                         // The grid is 16 steps of (4rem + 0.25rem gap) - last gap?
                         // Actually flex gap puts gap between all items.
                         // So 16 items + 15 gaps.
                         // Total Content Width = 16 * 4rem + 15 * 0.25rem = 64 + 3.75 = 67.75rem.
                         // Plus padding 1rem = 68.75rem.

                         // So we can calculate the ratio.
                         // So we can calculate the ratio.
                         const totalRems = steps * 4.25 + 0.75;
                         const pixelsPerRem = gridRect.width / totalRems;
                         const paddingLeft = 0.5 * pixelsPerRem;
                         const stepWidth = 4.25 * pixelsPerRem; // 4rem cell + 0.25rem gap

                         // Calculate mouse position relative to the content start
                         const mouseX = e.clientX - gridRect.left - paddingLeft;

                         // Calculate step index
                         // We use Math.round to make it "snap" to the nearest step center?
                         // Or Math.floor to be strict?
                         // The user said "mal tiré" (badly pulled), implying it's sensitive.
                         // If we use Math.round, it might feel more "magnetic".
                         // But strictly, a step is a discrete slot.
                         // Let's use Math.floor but add a small buffer (half step?) to make it feel like it snaps to the next one easier?
                         // No, standard behavior is: if you are in the box, you are in the step.

                         let currentStepUnderMouse = Math.floor(mouseX / stepWidth);

                         // Clamp currentStepUnderMouse to valid range
                         currentStepUnderMouse = Math.max(0, Math.min(steps - 1, currentStepUnderMouse));

                         // Calculate new duration
                         let newDuration = currentStepUnderMouse - originalStep + 1;

                         // Ensure duration is at least 1
                         newDuration = Math.max(1, newDuration);

                         // Update the grid if the duration has changed
                         setGrid(prevGrid => {
                              const newGrid = [...prevGrid];
                              const currentDuration = newGrid[originalStep][rowIndex];

                              if (currentDuration !== newDuration) {
                                   // Clear any cells that are now covered by the expanded note
                                   // or were previously covered but are no longer
                                   for (let i = 0; i < steps; i++) {
                                        if (i !== originalStep && newGrid[i][rowIndex] > 0) {
                                             // If a note starts at 'i' and its duration makes it overlap with the new note,
                                             // we might need more complex logic, but for now, we assume notes don't overlap
                                             // and we are only resizing the note at originalStep.
                                        }
                                   }

                                   // If shortening, ensure we don't leave orphaned notes
                                   if (newDuration < currentDuration) {
                                        // No specific action needed here, as we are only changing the duration of the starting note.
                                        // The rendering logic handles not showing covered cells.
                                   }

                                   // If expanding, ensure we don't overwrite existing notes that start in the expanded range
                                   let canExpand = true;
                                   for (let i = originalStep + 1; i < originalStep + newDuration; i++) {
                                        if (i < steps && newGrid[i][rowIndex] > 0) {
                                             // There's another note starting in the path of expansion, so we can't expand past it.
                                             newDuration = i - originalStep;
                                             break;
                                        }
                                   }

                                   // Apply the new duration
                                   newGrid[originalStep] = [...newGrid[originalStep]]; // Create a new array for the step
                                   newGrid[originalStep][rowIndex] = newDuration;
                                   return newGrid;
                              }
                              return prevGrid;
                         });
                    }
               }}
               onMouseUp={() => {
                    if (resizingNote) {
                         ignoreClickRef.current = true;
                         setTimeout(() => { ignoreClickRef.current = false; }, 100);
                    }
                    setResizingNote(null);
               }}
          >
               {pianoRollRow && (
                    <PianoRollModal
                         row={pianoRollRow}
                         rowIndex={pianoRollRowIndex}
                         grid={grid}
                         steps={steps}
                         isPlaying={isPlaying}
                         currentStep={currentStep}
                         onTogglePlay={togglePlay}
                         onClose={() => setPianoRollRowId(null)}
                         onUpdateNote={(step, note) => {
                              // Toggle note in array
                              const currentRow = rows.find(r => r.id === pianoRollRowId);
                              const currentNotes = currentRow?.notes?.[step] || [];
                              const newNotes = currentNotes.includes(note)
                                   ? currentNotes.filter(n => n !== note)
                                   : [...currentNotes, note];

                              if (pianoRollRowId) {
                                   const newNotesMap = { ...(currentRow?.notes || {}) };
                                   if (newNotes.length > 0) {
                                        newNotesMap[step] = newNotes;
                                   } else {
                                        delete newNotesMap[step];
                                   }

                                   updateRow(pianoRollRowId, {
                                        notes: newNotesMap
                                   });
                              }

                              // Update Grid (Duration)
                              // If there are any notes in the piano roll for this step, ensure grid has a duration of 1.
                              // If no notes, set grid duration to 0.
                              setGrid(prev => {
                                   const newGrid = [...prev];
                                   newGrid[step] = [...newGrid[step]]; // Create a new array for the step
                                   if (newNotes.length > 0) {
                                        if (newGrid[step][pianoRollRowIndex] === 0) {
                                             newGrid[step][pianoRollRowIndex] = 1;
                                        }
                                   } else {
                                        newGrid[step][pianoRollRowIndex] = 0;
                                   }
                                   return newGrid;
                              });
                         }}
                         playNote={(note) => {
                              // Preview Note
                              if (!audioCtxRef.current) return;
                              const ctx = audioCtxRef.current;
                              const gain = ctx.createGain();
                              gain.connect(ctx.destination);
                              gain.gain.setValueAtTime(0.1, ctx.currentTime);
                              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

                              const osc = ctx.createOscillator();
                              osc.connect(gain);
                              osc.type = 'triangle'; // Simple preview
                              osc.frequency.value = getFrequency(note);
                              osc.start(ctx.currentTime);
                              osc.stop(ctx.currentTime + 0.5);
                         }}
                    />
               )}

               <div className="sketch-box w-full max-w-[1400px] h-[90vh] flex flex-col gap-4 relative overflow-hidden text-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)]" onMouseUp={handleGridMouseUp}>

                    {/* HEADER */}
                    <div className="flex items-center justify-between border-b-[3px] border-black pb-4 bg-gray-50 p-4 rounded-t-xl shrink-0">
                         <div className="bg-purple-200 p-2 rounded-lg rotate-[-3deg] border-2 border-black shadow-[2px_2px_0px_black]">
                              <Music className="text-black" size={32} />
                         </div>
                         <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="bg-transparent text-3xl font-bold text-black border-b-2 border-black/20 focus:border-purple-500 outline-none placeholder-gray-400"
                              placeholder="Song Name"
                         />
                    </div>
                    <div className="flex items-center gap-6">
                         <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_black]">
                              <span className="text-gray-500 font-bold text-sm">TEMPO</span>
                              <input
                                   type="range"
                                   min="60"
                                   max="240"
                                   value={tempo}
                                   onChange={(e) => setTempo(Number(e.target.value))}
                                   className="w-32 accent-purple-500 cursor-pointer"
                              />
                              <span className="text-purple-600 font-black w-8 text-right text-xl">{tempo}</span>
                         </div>
                         <button
                              onClick={togglePlay}
                              className={`sketch-btn w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 ${isPlaying ? 'bg-red-100 hover:bg-red-200' : 'bg-green-100 hover:bg-green-200'}`}
                         >
                              {isPlaying ? <Square fill="currentColor" size={24} className="text-red-600" /> : <Play fill="currentColor" size={32} className="ml-1 text-green-600" />}
                         </button>
                         <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_black]">
                              <span className="text-gray-500 font-bold text-sm">STEPS</span>
                              <input
                                   type="range"
                                   min="8"
                                   max="64"
                                   step="8"
                                   value={steps}
                                   onChange={(e) => setSteps(Number(e.target.value))}
                                   className="w-24 accent-purple-500 cursor-pointer"
                              />
                              <span className="text-purple-600 font-black w-8 text-right text-xl">{steps}</span>
                         </div>
                    </div>


                    {/* MIXER & SEQUENCER - SCROLLABLE AREA */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
                         <div className="flex gap-4">

                              {/* LEFT SIDEBAR: MIXER CHANNELS */}
                              <div className="w-[300px] flex flex-col gap-2 shrink-0">
                                   {rows.map((row, index) => (
                                        <div
                                             key={row.id}
                                             className="h-[100px] bg-white rounded-xl border-2 border-black flex flex-col p-2 relative group hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)] transition-all shrink-0"
                                        >
                                             {/* Row Header */}
                                             <div className="flex items-center justify-between mb-2">
                                                  <div
                                                       className="flex items-center gap-2 font-bold text-lg truncate cursor-pointer hover:text-purple-600 transition-colors"
                                                       onClick={() => setEditingRowId(row.id)}
                                                  >
                                                       <div className={`w-4 h-4 rounded-full border-2 border-black ${(row.color || 'bg-gray-200').replace('bg-', 'bg-').replace('text-', 'text-')}`} />
                                                       {row.name}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                       {(row.type === 'SYNTH' || row.type === 'SAMPLE') && (
                                                            <button
                                                                 onClick={() => setPianoRollRowId(row.id)}
                                                                 className="text-gray-400 hover:text-purple-600 transition-colors"
                                                                 title="Piano Roll"
                                                            >
                                                                 <Music size={16} />
                                                            </button>
                                                       )}
                                                       <button onClick={() => setEditingRowId(row.id)} className="text-gray-400 hover:text-black"><Settings size={16} /></button>
                                                  </div>
                                             </div>

                                             {/* Controls */}
                                             <div className="flex items-center gap-3 flex-1">
                                                  {/* Volume Slider */}
                                                  <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
                                                       <Volume2 size={14} className="text-gray-400" />
                                                       <input
                                                            type="range"
                                                            min="0" max="1" step="0.1"
                                                            value={row.volume ?? 1}
                                                            onChange={(e) => updateRow(row.id, { volume: parseFloat(e.target.value) })}
                                                            className="w-full accent-gray-500 h-1"
                                                       />
                                                  </div>

                                                  {/* Mute / Solo */}
                                                  <div className="flex gap-1">
                                                       <button
                                                            onClick={() => updateRow(row.id, { isMuted: !row.isMuted })}
                                                            className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-xs transition-colors ${row.isMuted ? 'bg-red-100 text-red-600 border-red-400' : 'bg-white border-gray-200 text-gray-400 hover:border-black hover:text-black'}`}
                                                       >
                                                            M
                                                       </button>
                                                       <button
                                                            onClick={() => setSoloRowId(soloRowId === row.id ? null : row.id)}
                                                            className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-xs transition-colors ${soloRowId === row.id ? 'bg-yellow-100 text-yellow-600 border-yellow-400' : 'bg-white border-gray-200 text-gray-400 hover:border-black hover:text-black'}`}
                                                       >
                                                            S
                                                       </button>
                                                  </div>
                                             </div>
                                        </div>
                                   ))}

                                   <button
                                        onClick={addNewRow}
                                        className="h-12 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-black hover:border-black hover:bg-gray-50 transition-all font-bold shrink-0"
                                   >
                                        <Plus size={20} /> ADD TRACK
                                   </button>
                              </div>

                              {/* RIGHT SIDE: SEQUENCER GRID */}
                              <div className="flex-1 overflow-x-auto relative">
                                   <div className="min-w-max flex flex-col gap-2" ref={sequencerGridRef}>
                                        {rows.map((row, rowIndex) => (
                                             <div key={row.id} className="flex gap-1 h-[100px] bg-white rounded-xl border-2 border-black p-2 hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)] transition-all relative">
                                                  {/* Grid Background */}
                                                  <div className="absolute inset-0 flex gap-1 p-2 pointer-events-none">
                                                       {Array(steps).fill(null).map((_, step) => (
                                                            <div key={step} className={`flex-1 border-r border-gray-100 ${step % 4 === 3 ? 'border-gray-300' : ''}`} />
                                                       ))}
                                                  </div>

                                                  {/* AUDIO TRACK RENDERING */}
                                                  {row.type === 'AUDIO' ? (
                                                       <div
                                                            className="absolute inset-0 p-2 w-full h-full pointer-events-none"
                                                            onDragOver={(e) => {
                                                                 e.preventDefault();
                                                                 e.stopPropagation();
                                                            }}
                                                            onDrop={async (e) => {
                                                                 e.preventDefault();
                                                                 e.stopPropagation();
                                                                 const data = e.dataTransfer.getData('application/json');
                                                                 if (!data) return;

                                                                 try {
                                                                      const sample = JSON.parse(data);
                                                                      if (sample.type === 'SAMPLE') {
                                                                           // Calculate drop position
                                                                           const gridRect = sequencerGridRef.current?.getBoundingClientRect();
                                                                           if (!gridRect) return;

                                                                           // Calculate pixels per step (approximate)
                                                                           // We know 4rem + 0.25rem gap = 4.25rem per step.
                                                                           // 1rem = 16px (usually).
                                                                           // Let's try to be more precise by measuring the container width?
                                                                           // Or just use the same logic as resize?
                                                                           // Let's assume 1rem = 16px for now as we used in CSS.
                                                                           const stepWidthPx = 4.25 * 16;
                                                                           const dropX = e.clientX - gridRect.left - (0.5 * 16); // Subtract padding
                                                                           const startStep = Math.max(0, Math.floor(dropX / stepWidthPx));

                                                                           // Create Clip
                                                                           // We need duration. We have the base64 data.
                                                                           const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                                                           const arrayBuffer = await (await fetch(sample.data)).arrayBuffer();
                                                                           const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                                                                           const durationSeconds = audioBuffer.duration;
                                                                           const secondsPerBeat = 60.0 / tempo;
                                                                           const stepDuration = 0.25 * secondsPerBeat;
                                                                           const durationSteps = durationSeconds / stepDuration;

                                                                           const newClip: AudioClip = {
                                                                                id: Math.random().toString(36).substr(2, 9),
                                                                                startStep: startStep,
                                                                                durationSteps: durationSteps,
                                                                                offset: 0,
                                                                                isLooping: false,
                                                                                originalDurationSteps: durationSteps
                                                                           } as any;

                                                                           updateRow(row.id, {
                                                                                audioClips: [...(row.audioClips || []), newClip],
                                                                                sampleData: sample.data // Update track sample data too? Or just clip?
                                                                                // If we support multiple samples per track, we should probably store data in clip?
                                                                                // But current architecture stores `sampleData` on the ROW.
                                                                                // This implies one sample per track?
                                                                                // The `MusicRow` has `sampleData: string`. Single.
                                                                                // So for now, dropping a sample REPLACES the track's sample source.
                                                                                // And adds a clip.
                                                                           });
                                                                      }
                                                                 } catch (err) {
                                                                      console.error("Drop error", err);
                                                                 }
                                                            }}
                                                       >
                                                            {/* Empty State / Drop Zone */}
                                                            <div
                                                                 className="absolute inset-0 pointer-events-auto cursor-pointer hover:bg-black/5 transition-colors flex items-center justify-center group/track"
                                                                 onClick={() => document.getElementById(`upload-${row.id}`)?.click()}
                                                            >
                                                                 <input
                                                                      id={`upload-${row.id}`}
                                                                      type="file"
                                                                      accept="audio/*"
                                                                      className="hidden"
                                                                      onChange={(e) => handleFileUpload(e, row.id)}
                                                                 />
                                                                 {(!row.audioClips || row.audioClips.length === 0) && (
                                                                      <div className="flex flex-col items-center gap-2">
                                                                           <span className="text-gray-400 font-bold group-hover/track:text-black transition-colors flex items-center gap-2">
                                                                                <Upload size={16} /> Click to Add Audio
                                                                           </span>
                                                                           {row.sampleData && (
                                                                                <button
                                                                                     onClick={(e) => {
                                                                                          e.stopPropagation();
                                                                                          // Restore clip from sampleData
                                                                                          // We need to calculate duration again... or just default to 4 steps?
                                                                                          // Ideally we decode it again or store duration.
                                                                                          // Let's try to decode it quickly or just use a default and let user resize.
                                                                                          // Actually, we can reuse the logic from handleFileUpload if we extract it,
                                                                                          // but since we can't easily await here without async wrapper, let's just add a default clip
                                                                                          // and maybe trigger a duration recalc effect?
                                                                                          // Or just decode it here.
                                                                                          const restore = async () => {
                                                                                               const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                                                                               const arrayBuffer = await (await fetch(row.sampleData!)).arrayBuffer();
                                                                                               const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                                                                                               const durationSeconds = audioBuffer.duration;
                                                                                               const secondsPerBeat = 60.0 / tempo;
                                                                                               const stepDuration = 0.25 * secondsPerBeat;
                                                                                               const durationSteps = durationSeconds / stepDuration;

                                                                                               const newClip: AudioClip = {
                                                                                                    id: Math.random().toString(36).substr(2, 9),
                                                                                                    startStep: 0,
                                                                                                    durationSteps: durationSteps,
                                                                                                    offset: 0,
                                                                                                    isLooping: false,
                                                                                                    originalDurationSteps: durationSteps
                                                                                               } as any;

                                                                                               updateRow(row.id, { audioClips: [newClip] });
                                                                                          };
                                                                                          restore();
                                                                                     }}
                                                                                     className="text-xs bg-white border border-black px-2 py-1 rounded shadow-[2px_2px_0px_black] hover:bg-gray-100 font-bold flex items-center gap-1"
                                                                                >
                                                                                     <Mic size={12} /> Restore Recording
                                                                                </button>
                                                                           )}
                                                                      </div>
                                                                 )}
                                                            </div>

                                                            {/* Render Clips */}
                                                            {row.audioClips?.map((clip) => {
                                                                 const widthPercent = (clip.durationSteps / steps) * 100;
                                                                 const leftPercent = (clip.startStep / steps) * 100;

                                                                 // Calculate how many times to repeat the waveform
                                                                 // We need the original sample duration in steps.
                                                                 // We can approximate it if we assume the clip was created with the full duration initially?
                                                                 // Or we need to store the original duration in the clip or calculate it from the buffer.
                                                                 // Since we don't have the buffer here easily without decoding, let's rely on a prop or just assume standard ratio?
                                                                 // Actually, we can just use the `offset` and `duration` to determine the "window".
                                                                 // But for visual looping, we need to know the "cycle length".
                                                                 // Let's assume for now that the clip's visual width is the "window".
                                                                 // If we want to show looping, we need to render the waveform multiple times.
                                                                 // A simple way is to use `background-repeat` but we are using a canvas.
                                                                 // So we can just render multiple WaveformCanvas components side-by-side?
                                                                 // Or just one WaveformCanvas that draws the data repeatedly?
                                                                 // `WaveformCanvas` takes `audioData` (base64).
                                                                 // Let's try to render it multiple times if duration > sampleDuration.
                                                                 // But we don't know sampleDuration here easily!
                                                                 // Wait, `handleFileUpload` calculates `durationSteps`.
                                                                 // We should probably store `originalDurationSteps` on the clip or row?
                                                                 // For now, let's just stretch it? No, user said "PAS rapetisse" (don't shrink/stretch).
                                                                 // User said "repeat it".
                                                                 // If we don't know the original duration, we can't know when to repeat.
                                                                 // However, when we create the clip, we set `durationSteps`.
                                                                 // Let's assume the initial `durationSteps` IS the sample length.
                                                                 // But if we resize it, `durationSteps` changes.
                                                                 // We need to store `sampleDurationSteps` on the clip or row.
                                                                 // Let's add `sampleDurationSteps` to `AudioClip`?
                                                                 // Or just use `row.sampleDuration` if we had it.
                                                                 // Let's hack it: If we assume the user hasn't stretched it (speed change),
                                                                 // then the visual repetition depends on the ratio of current duration to... something.
                                                                 // Actually, if we just want to "reveal" more of the loop, we can just keep the waveform scale constant.
                                                                 // The `WaveformCanvas` draws the WHOLE buffer into its width.
                                                                 // If we want to show a loop, we need to draw the buffer into a subset of the width.
                                                                 // This is getting complex for a simple visual.
                                                                 // Alternative: Use a background image of the waveform?
                                                                 // Let's try to just render the WaveformCanvas with `object-fit: cover`? No.
                                                                 // Let's just render multiple WaveformCanvas elements.
                                                                 // We need to know the width of ONE cycle.
                                                                 // Let's assume 4 bars (16 steps) is a common loop? No.
                                                                 // Let's look at `handleFileUpload` again. It calculates `durationSteps`.
                                                                 // We should save this as `originalDurationSteps` in the clip.
                                                                 // I'll update `handleFileUpload` to save `originalDurationSteps`.
                                                                 // For now, let's assume `clip.originalDurationSteps` exists (I'll add it).

                                                                 const originalDuration = (clip as any).originalDurationSteps || clip.durationSteps;
                                                                 const loopCount = Math.ceil(clip.durationSteps / originalDuration);

                                                                 return (
                                                                      <div
                                                                           key={clip.id}
                                                                           className="absolute top-1 bottom-1 bg-green-200 border-2 border-black rounded-lg overflow-hidden pointer-events-auto cursor-move group"
                                                                           style={{
                                                                                left: `calc(${clip.startStep} * 4.25rem)`,
                                                                                width: `calc(${clip.durationSteps} * 4.25rem - 0.25rem)`,
                                                                           }}
                                                                           onMouseDown={(e) => {
                                                                                e.stopPropagation();
                                                                                setDraggingClip({
                                                                                     clipId: clip.id,
                                                                                     rowId: row.id,
                                                                                     startX: e.clientX,
                                                                                     originalStartStep: clip.startStep
                                                                                });
                                                                           }}
                                                                      >
                                                                           {/* Waveform Visualization (Windowed / Cropped) */}
                                                                           <div className="absolute inset-0 opacity-50 pointer-events-none overflow-hidden rounded-lg">
                                                                                <div
                                                                                     style={{
                                                                                          position: 'absolute',
                                                                                          top: 0,
                                                                                          bottom: 0,
                                                                                          // Calculate left offset based on clip.offset (seconds)
                                                                                          // offsetSteps = offset / stepDuration
                                                                                          // left = -offsetSteps * 4.25rem
                                                                                          left: `calc(-${(clip.offset || 0) / (0.25 * (60.0 / tempo))} * 4.25rem)`,
                                                                                          width: `calc(${originalDuration} * 4.25rem)`,
                                                                                          display: 'flex'
                                                                                     }}
                                                                                >
                                                                                     {/* Render enough copies to cover the potential loop?
                                                                                          For now, just one copy as "Simple Sample" usually implies one shot.
                                                                                          But if we want looping, we can repeat.
                                                                                          Let's render 1 copy for now as the user focused on "stretching".
                                                                                      */}
                                                                                     <div className="w-full h-full relative">
                                                                                          {row.sampleData && (
                                                                                               <WaveformCanvas
                                                                                                    audioData={row.sampleData}
                                                                                                    trimStart={0}
                                                                                                    trimEnd={1}
                                                                                                    color="#166534"
                                                                                               />
                                                                                          )}
                                                                                     </div>
                                                                                </div>
                                                                           </div>

                                                                           <span className="relative z-10 font-bold text-xs p-1 text-green-900 truncate block">{row.name}</span>

                                                                           {/* Clip Actions (Hover) */}
                                                                           <div className="absolute top-1 right-6 hidden group-hover:flex gap-1 z-20">
                                                                                <button
                                                                                     className="p-1 bg-white/80 hover:bg-white rounded border border-black text-black"
                                                                                     onClick={(e) => { e.stopPropagation(); duplicateClip(row.id, clip.id); }}
                                                                                     title="Duplicate"
                                                                                >
                                                                                     <Copy size={12} />
                                                                                </button>
                                                                                <button
                                                                                     className="p-1 bg-white/80 hover:bg-red-100 rounded border border-black text-red-500"
                                                                                     onClick={(e) => { e.stopPropagation(); deleteClip(row.id, clip.id); }}
                                                                                     title="Delete"
                                                                                >
                                                                                     <Trash2 size={12} />
                                                                                </button>
                                                                           </div>

                                                                           {/* Resize Handle (Right) */}
                                                                           <div
                                                                                className="absolute right-0 top-0 bottom-0 w-4 cursor-e-resize hover:bg-black/20 flex items-center justify-center"
                                                                                onMouseDown={(e) => {
                                                                                     e.stopPropagation();
                                                                                     setResizingClip({
                                                                                          clipId: clip.id,
                                                                                          rowId: row.id,
                                                                                          startX: e.clientX,
                                                                                          originalDuration: clip.durationSteps
                                                                                     });
                                                                                }}
                                                                           >
                                                                                <div className="w-1 h-4 bg-black/20 rounded-full" />
                                                                           </div>

                                                                           {/* Resize Handle (Left) */}
                                                                           <div
                                                                                className="absolute left-0 top-0 bottom-0 w-4 cursor-w-resize hover:bg-black/20 flex items-center justify-center z-30"
                                                                                onMouseDown={(e) => {
                                                                                     e.stopPropagation();
                                                                                     setResizingClipStart({
                                                                                          clipId: clip.id,
                                                                                          rowId: row.id,
                                                                                          startX: e.clientX,
                                                                                          originalStartStep: clip.startStep,
                                                                                          originalDuration: clip.durationSteps,
                                                                                          originalOffset: clip.offset || 0
                                                                                     });
                                                                                }}
                                                                           >
                                                                                <div className="w-1 h-4 bg-black/20 rounded-full" />
                                                                           </div>
                                                                      </div>
                                                                 );
                                                            })}

                                                            {/* Click on empty space to add clip? Or maybe just drag and drop? */}
                                                            {/* For now, clips are added via recording/upload */}
                                                       </div>
                                                  ) : (
                                                       /* STANDARD SEQUENCER RENDERING */
                                                       Array(steps).fill(null).map((_, step) => {
                                                            const duration = grid[step]?.[rowIndex] || 0;
                                                            const isCurrent = currentStep >= step && currentStep < step + (duration || 1);

                                                            // Check if this cell is covered by a previous note
                                                            let isCovered = false;
                                                            for (let i = 1; i < steps; i++) {
                                                                 if (step - i >= 0 && grid[step - i]?.[rowIndex] > i) {
                                                                      isCovered = true;
                                                                      break;
                                                                 }
                                                            }

                                                            if (isCovered) return null; // Don't render anything if covered

                                                            if (duration > 0) {
                                                                 // RENDER NOTE
                                                                 return (
                                                                      <div
                                                                           key={step}
                                                                           className={`
                                                                            relative h-full rounded-md cursor-pointer transition-all duration-75 border-2 z-10
                                                                            ${row.color || 'bg-gray-200'} border-black shadow-[2px_2px_0px_rgba(0,0,0,0.2)]
                                                                            ${isCurrent ? 'ring-4 ring-purple-200' : ''}
                                                                       `}
                                                                           style={{
                                                                                width: `calc(${duration} * 4rem + ${(duration - 1) * 0.25}rem)`, // 4rem = w-16, 0.25rem = gap-1
                                                                                flexShrink: 0
                                                                           }}
                                                                           onClick={(e) => e.stopPropagation()}
                                                                           onMouseDown={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault(); // Prevent native drag/selection
                                                                                handleGridMouseDown(step, rowIndex, true);
                                                                           }}
                                                                           onMouseEnter={() => {
                                                                                handleGridMouseEnter(step, rowIndex, true);

                                                                                // Handle shortening (drag left back into the note)
                                                                                if (resizingNote && resizingNote.row === rowIndex && resizingNote.step === step) {
                                                                                     // We are hovering over the note itself while resizing it.
                                                                                     // This logic is tricky because the note covers multiple cells.
                                                                                     // We need to calculate which "sub-cell" we are over.
                                                                                     // But since we are using grid cells for mouse events, this event only fires for the START cell.
                                                                                     // So we can't easily shorten by hovering the start cell unless we make it 1.

                                                                                     // Actually, we can rely on the empty slots for expansion.
                                                                                     // For shortening, we need to detect when we hover over the "virtual" cells covered by this note.
                                                                                     // But those are not rendered!

                                                                                     // Alternative: Render the covered cells as invisible drop targets?
                                                                                     // Or just use mouse move on the container?

                                                                                     // Simplest fix for now: If we hover the start cell, reset to 1?
                                                                                     // No, that's too aggressive.
                                                                                }
                                                                           }}
                                                                      >
                                                                           {/* Resize Handle */}
                                                                           <div
                                                                                className="absolute right-0 top-0 bottom-0 w-6 cursor-e-resize hover:bg-black/10 flex items-center justify-center group/handle"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                onMouseDown={(e) => {
                                                                                     e.stopPropagation();
                                                                                     setResizingNote({ step, row: rowIndex });
                                                                                }}
                                                                           >
                                                                                <div className="w-1 h-4 bg-black/20 rounded-full group-hover/handle:bg-black/40 transition-colors" />
                                                                           </div>
                                                                      </div>
                                                                 );
                                                            } else {
                                                                 // RENDER EMPTY SLOT
                                                                 return (
                                                                      <div
                                                                           key={step}
                                                                           className={`
                                                                            w-16 h-full rounded-md cursor-pointer transition-all duration-75 border-2 select-none
                                                                            bg-white border-gray-100 hover:border-gray-400
                                                                            ${currentStep === step ? 'bg-purple-50' : ''}
                                                                       `}
                                                                           onMouseDown={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault(); // Prevent native drag/selection
                                                                                handleGridMouseDown(step, rowIndex, false);
                                                                           }}
                                                                           onMouseEnter={() => handleGridMouseEnter(step, rowIndex, false)}
                                                                      />
                                                                 );
                                                            }
                                                       })
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                              </div>
                         </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex justify-between items-center pt-4 border-t-[3px] border-black bg-gray-50 p-4 rounded-b-xl shrink-0 relative z-20">
                         <button
                              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                              className={`sketch-btn px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-lg transition-all ${isLibraryOpen ? 'bg-purple-600 text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                         >
                              <Library size={24} /> Sample Library
                              {isLibraryOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                         </button>

                         <div className="flex gap-4">
                              <button onClick={onCancel} className="sketch-btn px-6 py-3 rounded-xl text-black hover:bg-gray-100 font-bold flex items-center gap-2 text-lg">
                                   <X size={24} /> CANCEL
                              </button>
                              <button onClick={handleSave} className="sketch-btn px-8 py-3 rounded-xl bg-purple-100 text-purple-900 font-bold flex items-center gap-2 text-lg hover:bg-purple-200">
                                   <Save size={24} /> SAVE TRACK
                              </button>
                         </div>
                    </div>

                    {/* SAMPLE LIBRARY DRAWER */}
                    <div className={`absolute bottom-0 left-0 right-0 bg-white border-t-[3px] border-black transition-transform duration-300 ease-in-out z-10 flex flex-col ${isLibraryOpen ? 'translate-y-[-80px]' : 'translate-y-full'}`} style={{ height: '250px', bottom: '80px' }}>
                         <div className="bg-purple-100 p-2 border-b-2 border-black flex justify-between items-center">
                              <h3 className="font-bold text-lg flex items-center gap-2"><Library size={18} /> My Samples</h3>
                              <label className="cursor-pointer bg-white border-2 border-black px-3 py-1 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center gap-2">
                                   <Upload size={14} /> Import Sample
                                   <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                             const reader = new FileReader();
                                             reader.onload = (ev) => {
                                                  addToLibrary(file.name, ev.target?.result as string);
                                             };
                                             reader.readAsDataURL(file);
                                        }
                                   }} />
                              </label>
                         </div>
                         <div className="flex-1 overflow-x-auto p-4 flex gap-4 bg-gray-50">
                              {librarySamples.length === 0 ? (
                                   <div className="flex-1 flex flex-col items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-300 rounded-xl">
                                        <Library size={48} className="mb-2 opacity-50" />
                                        <p>Library is empty</p>
                                        <p className="text-sm font-normal">Import samples or drag them here</p>
                                   </div>
                              ) : (
                                   librarySamples.map(sample => (
                                        <div
                                             key={sample.id}
                                             className="w-40 h-32 bg-white border-2 border-black rounded-xl flex flex-col overflow-hidden shrink-0 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative"
                                             draggable
                                             onDragStart={(e) => {
                                                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'SAMPLE', ...sample }));
                                                  e.dataTransfer.effectAllowed = 'copy';
                                             }}
                                        >
                                             <div className="flex-1 bg-green-50 relative">
                                                  <WaveformCanvas audioData={sample.data} trimStart={0} trimEnd={1} color="#166534" />
                                             </div>
                                             <div className="p-2 border-t-2 border-black bg-white font-bold text-xs truncate flex justify-between items-center">
                                                  <span className="truncate flex-1" title={sample.name}>{sample.name}</span>
                                                  <button
                                                       onClick={() => setLibrarySamples(prev => prev.filter(s => s.id !== sample.id))}
                                                       className="text-gray-400 hover:text-red-500"
                                                  >
                                                       <Trash2 size={12} />
                                                  </button>
                                             </div>
                                        </div>
                                   ))
                              )}
                         </div>
                    </div>
               </div>

               {/* INSTRUMENT EDITOR MODAL */}
               {editingRow && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                         <div className="sketch-box p-8 w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-6 text-black shadow-[12px_12px_0px_rgba(0,0,0,0.5)]">
                              <div className="flex justify-between items-center border-b-2 border-black pb-4">
                                   <h3 className="font-bold text-2xl flex items-center gap-2">
                                        <Settings className="text-purple-600" /> Edit Track
                                   </h3>
                                   <button onClick={() => setEditingRowId(null)} className="hover:text-red-500"><X size={24} /></button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                        <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Track Name</label>
                                        <input
                                             className="w-full bg-white border-2 border-black rounded-lg p-3 font-bold text-lg focus:border-purple-500 outline-none"
                                             value={editingRow.name}
                                             onChange={(e) => updateRow(editingRow.id, { name: e.target.value })}
                                        />
                                   </div>
                                   <div className="space-y-2">
                                        <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Color</label>
                                        <div className="flex gap-2">
                                             {['bg-red-200', 'bg-orange-200', 'bg-yellow-200', 'bg-green-200', 'bg-blue-200', 'bg-purple-200', 'bg-pink-200'].map(c => (
                                                  <button
                                                       key={c}
                                                       onClick={() => updateRow(editingRow.id, { color: c })}
                                                       className={`w-8 h-8 rounded-full border-2 border-black ${c} ${editingRow.color === c ? 'ring-2 ring-black scale-110 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                                                  />
                                             ))}
                                        </div>
                                   </div>
                              </div>

                              <div className="space-y-2">
                                   <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Sound Source</label>
                                   <div className="flex gap-2 bg-gray-100 p-1 rounded-lg border-2 border-black">
                                        <button
                                             onClick={() => updateRow(editingRow.id, { type: 'SYNTH', note: 'C4' })}
                                             className={`flex-1 py-2 rounded-md font-bold transition-all ${editingRow.type === 'SYNTH' ? 'bg-purple-200 text-black border-2 border-black shadow-[2px_2px_0px_black]' : 'text-gray-500 hover:text-black'}`}
                                        >
                                             SYNTH
                                        </button>
                                        <button
                                             onClick={() => updateRow(editingRow.id, { type: 'SAMPLE' })}
                                             className={`flex-1 py-2 rounded-md font-bold transition-all ${editingRow.type === 'SAMPLE' ? 'bg-blue-200 text-black border-2 border-black shadow-[2px_2px_0px_black]' : 'text-gray-500 hover:text-black'}`}
                                        >
                                             SAMPLE
                                        </button>
                                        <button
                                             onClick={() => updateRow(editingRow.id, { type: 'AUDIO', audioClips: editingRow.audioClips || [] })}
                                             className={`flex-1 py-2 rounded-md font-bold transition-all ${editingRow.type === 'AUDIO' ? 'bg-green-200 text-black border-2 border-black shadow-[2px_2px_0px_black]' : 'text-gray-500 hover:text-black'}`}
                                        >
                                             AUDIO TRACK
                                        </button>
                                   </div>
                              </div>

                              <div className="space-y-4">
                                   {/* Common Controls for both types */}
                                   {/* Sound Design */}
                                   <div className="space-y-4 border-t-2 border-black pt-4">
                                        <h4 className="font-bold text-lg">Sound Design</h4>

                                        {/* Instrument Preset (SYNTH ONLY) */}
                                        {editingRow.type === 'SYNTH' && (
                                             <div className="space-y-2">
                                                  <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Instrument</label>
                                                  <select
                                                       value={editingRow.instrumentPreset || 'DEFAULT'}
                                                       onChange={(e) => updateRow(editingRow.id, { instrumentPreset: e.target.value as any })}
                                                       className="w-full bg-white border-2 border-black rounded-lg p-2 font-bold"
                                                  >
                                                       <option value="DEFAULT">Default Synth</option>
                                                       <option value="PIANO">Piano</option>
                                                       <option value="GUITAR">Guitar</option>
                                                       <option value="BASS">Bass</option>
                                                       <option value="KICK">Kick Drum</option>
                                                       <option value="SNARE">Snare Drum</option>
                                                       <option value="HIHAT">Hi-Hat</option>
                                                  </select>
                                             </div>
                                        )}

                                        {/* Recording Controls (SAMPLE & AUDIO) */}
                                        {(editingRow.type === 'SAMPLE' || editingRow.type === 'AUDIO') && (
                                             <div className="space-y-4">
                                                  <div className="flex flex-col gap-2">
                                                       <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Voice Recording / Upload</label>
                                                       <div className="relative w-full h-24 bg-gray-100 rounded-xl border-2 border-black overflow-hidden flex items-center justify-center">
                                                            {editingRow.sampleData ? (
                                                                 <WaveformCanvas
                                                                      audioData={editingRow.sampleData}
                                                                      trimStart={editingRow.trimStart || 0}
                                                                      trimEnd={editingRow.trimEnd || 1}
                                                                 />
                                                            ) : (
                                                                 <span className="text-gray-400 font-bold text-sm">No recording yet</span>
                                                            )}
                                                       </div>
                                                       <button
                                                            onMouseDown={startRecording}
                                                            onMouseUp={stopRecording}
                                                            onMouseLeave={stopRecording}
                                                            onTouchStart={startRecording}
                                                            onTouchEnd={stopRecording}
                                                            className={`
                                                                  w-full py-4 rounded-xl border-2 border-black font-bold text-xl flex items-center justify-center gap-3 transition-all
                                                                  ${isRecording ? 'bg-red-500 text-white scale-95' : 'bg-red-100 text-red-900 hover:bg-red-200'}
                                                             `}
                                                       >
                                                            {isRecording ? <><Square fill="currentColor" /> RECORDING...</> : <><Mic /> HOLD TO RECORD</>}
                                                       </button>
                                                       <div className="flex items-center justify-center">
                                                            <label className="cursor-pointer flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors">
                                                                 <Upload size={16} /> Upload Audio File
                                                                 <input
                                                                      type="file"
                                                                      accept="audio/*"
                                                                      className="hidden"
                                                                      onChange={(e) => handleFileUpload(e, editingRow.id)}
                                                                 />
                                                            </label>
                                                       </div>
                                                  </div>

                                                  {editingRow.sampleData && (
                                                       <div className="space-y-2">
                                                            <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Trim Sample</label>
                                                            <div className="flex gap-4">
                                                                 <div className="flex-1">
                                                                      <label className="text-xs font-bold">Start</label>
                                                                      <input
                                                                           type="range"
                                                                           min="0" max="1" step="0.01"
                                                                           value={editingRow.trimStart || 0}
                                                                           onChange={(e) => updateRow(editingRow.id, { trimStart: parseFloat(e.target.value) })}
                                                                           className="w-full h-2 accent-black"
                                                                      />
                                                                 </div>
                                                                 <div className="flex-1">
                                                                      <label className="text-xs font-bold">End</label>
                                                                      <input
                                                                           type="range"
                                                                           min="0" max="1" step="0.01"
                                                                           value={editingRow.trimEnd || 1}
                                                                           onChange={(e) => updateRow(editingRow.id, { trimEnd: parseFloat(e.target.value) })}
                                                                           className="w-full h-2 accent-black"
                                                                      />
                                                                 </div>
                                                            </div>
                                                       </div>
                                                  )}

                                                  {/* AUDIO TRACK SPECIFIC SETTINGS */}
                                                  {editingRow.type === 'AUDIO' && (
                                                       <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 space-y-4">
                                                            <h5 className="font-bold text-green-800 flex items-center gap-2"><Sliders size={16} /> Audio Track Settings</h5>

                                                            <div className="space-y-2">
                                                                 <label className="text-xs font-bold text-green-700">Playback Speed (Pitch Shift)</label>
                                                                 <input
                                                                      type="range"
                                                                      min="0.5" max="2.0" step="0.1"
                                                                      value={editingRow.audioSettings?.playbackRate ?? 1.0}
                                                                      onChange={(e) => updateRow(editingRow.id, {
                                                                           audioSettings: { ...editingRow.audioSettings, playbackRate: parseFloat(e.target.value) } as any
                                                                      })}
                                                                      className="w-full accent-green-600"
                                                                 />
                                                                 <div className="flex justify-between text-xs font-bold text-green-600">
                                                                      <span>0.5x</span>
                                                                      <span>{editingRow.audioSettings?.playbackRate ?? 1.0}x</span>
                                                                      <span>2.0x</span>
                                                                 </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                 <label className="text-xs font-bold text-green-700">Pitch Correction (Semitones)</label>
                                                                 <input
                                                                      type="range"
                                                                      min="-12" max="12" step="1"
                                                                      value={editingRow.audioSettings?.pitch ?? 0}
                                                                      onChange={(e) => updateRow(editingRow.id, {
                                                                           audioSettings: { ...editingRow.audioSettings, pitch: parseFloat(e.target.value) } as any
                                                                      })}
                                                                      className="w-full accent-green-600"
                                                                 />
                                                                 <div className="flex justify-between text-xs font-bold text-green-600">
                                                                      <span>-12</span>
                                                                      <span>{editingRow.audioSettings?.pitch ?? 0}</span>
                                                                      <span>+12</span>
                                                                 </div>
                                                            </div>
                                                       </div>
                                                  )}
                                             </div>
                                        )}

                                        {/* Waveform (if Synth) */}
                                        {editingRow.type === 'SYNTH' && (
                                             <div className="space-y-2">
                                                  <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Waveform</label>
                                                  <div className="flex gap-2">
                                                       {['square', 'sawtooth', 'triangle', 'sine'].map(w => (
                                                            <button
                                                                 key={w}
                                                                 onClick={() => updateRow(editingRow.id, { waveform: w as any })}
                                                                 className={`flex-1 py-1 rounded border-2 border-black font-bold text-xs uppercase ${editingRow.waveform === w ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                                                            >
                                                                 {w}
                                                            </button>
                                                       ))}
                                                  </div>
                                             </div>
                                        )}

                                        {/* ADSR */}
                                        <div className="space-y-2">
                                             <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Envelope (ADSR)</label>
                                             <div className="grid grid-cols-4 gap-2">
                                                  {['attack', 'decay', 'sustain', 'release'].map(param => (
                                                       <div key={param} className="flex flex-col items-center">
                                                            <input
                                                                 type="range"
                                                                 min="0" max="1" step="0.01"
                                                                 value={editingRow.adsr?.[param as keyof typeof editingRow.adsr] ?? (param === 'sustain' ? 0.5 : 0.1)}
                                                                 onChange={(e) => updateRow(editingRow.id, { adsr: { ...editingRow.adsr, [param]: parseFloat(e.target.value) } as any })}
                                                                 className="w-full h-2 accent-purple-600"
                                                            />
                                                            <span className="text-[10px] font-bold uppercase">{param.substr(0, 1)}</span>
                                                       </div>
                                                  ))}
                                             </div>
                                        </div>

                                        {/* FX */}
                                        <div className="space-y-2">
                                             <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Effects</label>
                                             <div className="flex gap-2">
                                                  <button
                                                       onClick={() => updateRow(editingRow.id, { fx: { ...editingRow.fx, delay: !editingRow.fx?.delay } })}
                                                       className={`flex-1 py-2 rounded border-2 border-black font-bold ${editingRow.fx?.delay ? 'bg-purple-100 text-purple-900' : 'bg-white text-gray-400'}`}
                                                  >
                                                       DELAY
                                                  </button>
                                                  <button
                                                       onClick={() => updateRow(editingRow.id, { fx: { ...editingRow.fx, reverb: !editingRow.fx?.reverb } })}
                                                       className={`flex-1 py-2 rounded border-2 border-black font-bold ${editingRow.fx?.reverb ? 'bg-purple-100 text-purple-900' : 'bg-white text-gray-400'}`}
                                                  >
                                                       REVERB
                                                  </button>
                                             </div>
                                        </div>
                                   </div>
                              </div>

                              <div className="pt-6 border-t-2 border-black flex justify-between">
                                   <button
                                        onClick={() => { deleteRow(editingRow.id); setEditingRowId(null); }}
                                        className="px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                                   >
                                        <Trash2 size={18} /> Delete Track
                                   </button>
                                   <button
                                        onClick={() => setEditingRowId(null)}
                                        className="sketch-btn px-8 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                                   >
                                        Done
                                   </button>
                              </div>
                         </div>
                    </div>
               )}
          </div>
     );
};
