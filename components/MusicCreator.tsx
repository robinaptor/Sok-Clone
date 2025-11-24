import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Save, Trash2, Plus, Music, Mic, Settings, Volume2, Scissors, Clock, Sliders } from 'lucide-react';
import { WaveformCanvas } from './WaveformCanvas';
import { GameData, MusicTrack, MusicRow } from '../types';

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

     useEffect(() => {
          const handleMouseUp = () => {
               if (resizingNote) setResizingNote(null);
          };
          window.addEventListener('mouseup', handleMouseUp);
          return () => window.removeEventListener('mouseup', handleMouseUp);
     }, [resizingNote]);

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

     const scheduleNote = (stepNumber: number, time: number) => {
          if (grid[stepNumber]) {
               grid[stepNumber].forEach((duration, rowIndex) => {
                    if (duration > 0) {
                         // Check for melody note override
                         const row = rows[rowIndex];
                         const melodyNotes = row.notes?.[stepNumber]; // This can now be an array of notes
                         playRowSound(rowIndex, time, duration, melodyNotes);
                    }
               });
          }
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
                    reader.onloadend = () => {
                         const base64 = reader.result as string;
                         if (editingRowId) {
                              setRows(prev => prev.map(r => r.id === editingRowId ? { ...r, sampleData: base64, trimStart: 0, trimEnd: 1 } : r));
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

                                                  {/* Grid Cells & Notes */}
                                                  {Array(steps).fill(null).map((_, step) => {
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
                                                  })}
                                             </div>
                                        ))}
                                   </div>
                              </div>
                         </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex justify-end gap-4 pt-4 border-t-[3px] border-black bg-gray-50 p-4 rounded-b-xl shrink-0">
                         <button onClick={onCancel} className="sketch-btn px-6 py-3 rounded-xl text-black hover:bg-gray-100 font-bold flex items-center gap-2 text-lg">
                              <X size={24} /> CANCEL
                         </button>
                         <button onClick={handleSave} className="sketch-btn px-8 py-3 rounded-xl bg-purple-100 text-purple-900 font-bold flex items-center gap-2 text-lg hover:bg-purple-200">
                              <Save size={24} /> SAVE TRACK
                         </button>
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

                                        {/* Recording Controls (SAMPLE ONLY) */}
                                        {editingRow.type === 'SAMPLE' && (
                                             <div className="space-y-4">
                                                  <div className="flex flex-col gap-2">
                                                       <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Voice Recording</label>
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
