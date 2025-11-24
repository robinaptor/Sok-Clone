import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Save, Trash2, Plus, Music, Mic, Settings, Volume2, Scissors, Clock } from 'lucide-react';
import { MusicTrack, MusicRow } from '../types';

interface MusicCreatorProps {
     onSave: (track: MusicTrack) => void;
     onCancel: () => void;
     initialTrack?: MusicTrack;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [4, 5]; // 2 Octaves
const STEPS = 16;

const generateDefaultRows = (): MusicRow[] => {
     const rows: MusicRow[] = [];
     // Default Kit - Pastel Colors
     rows.push({ id: 'kick', name: 'KICK', type: 'SYNTH', note: 'C4', color: 'bg-red-200', volume: 1.0, isMuted: false, instrumentPreset: 'KICK' });
     rows.push({ id: 'snare', name: 'SNARE', type: 'SYNTH', note: 'D4', color: 'bg-blue-200', volume: 1.0, isMuted: false, instrumentPreset: 'SNARE' });
     rows.push({ id: 'hihat', name: 'HIHAT', type: 'SYNTH', note: 'F#4', color: 'bg-yellow-200', volume: 0.8, isMuted: false, instrumentPreset: 'HIHAT' });
     rows.push({ id: 'bass', name: 'BASS', type: 'SYNTH', note: 'A4', color: 'bg-purple-200', volume: 1.0, isMuted: false, instrumentPreset: 'BASS' });
     return rows;
};

export const MusicCreator: React.FC<MusicCreatorProps> = ({ onSave, onCancel, initialTrack }) => {
     const [name, setName] = useState(initialTrack?.name || "New Song");
     const [tempo, setTempo] = useState(120);

     // Initialize rows
     const [rows, setRows] = useState<MusicRow[]>(initialTrack?.rows || generateDefaultRows());

     // Grid: [step][rowIndex] -> boolean
     const [grid, setGrid] = useState<boolean[][]>(() => {
          if (initialTrack?.sequence) {
               return Array(STEPS).fill(null).map((_, step) => {
                    const stepNotes = Array(rows.length).fill(false);
                    initialTrack.sequence?.filter(n => n.time === step).forEach(n => {
                         if (n.note < stepNotes.length) stepNotes[n.note] = true;
                    });
                    return stepNotes;
               });
          } else {
               return Array(STEPS).fill(null).map(() => Array(rows.length).fill(false));
          }
     });

     const [isPlaying, setIsPlaying] = useState(false);
     const [currentStep, setCurrentStep] = useState(0);
     const [soloRowId, setSoloRowId] = useState<string | null>(null);

     // Instrument Editor State
     const [editingRowId, setEditingRowId] = useState<string | null>(null);
     const [isRecording, setIsRecording] = useState(false);
     const mediaRecorderRef = useRef<MediaRecorder | null>(null);
     const chunksRef = useRef<BlobPart[]>([]);

     const audioCtxRef = useRef<AudioContext | null>(null);
     const nextNoteTimeRef = useRef(0);
     const timerIDRef = useRef<number | null>(null);
     const stepRef = useRef(0);
     const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

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
                    const newStepNotes = Array(rows.length).fill(false);
                    stepNotes.forEach((isActive, i) => {
                         if (i < newStepNotes.length) newStepNotes[i] = isActive;
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

     const playRowSound = (rowIndex: number, time: number) => {
          if (!audioCtxRef.current) return;
          const ctx = audioCtxRef.current;
          const row = rows[rowIndex];

          // Mute/Solo Logic
          if (row.isMuted && soloRowId !== row.id) return;
          if (soloRowId && soloRowId !== row.id) return;

          const volume = row.volume ?? 1.0;

          if (row.type === 'SAMPLE' && row.sampleData) {
               fetch(row.sampleData)
                    .then(res => res.arrayBuffer())
                    .then(buffer => ctx.decodeAudioData(buffer))
                    .then(audioBuffer => {
                         const source = ctx.createBufferSource();
                         source.buffer = audioBuffer;

                         const gain = ctx.createGain();
                         gain.gain.value = volume;

                         source.connect(gain);
                         gain.connect(ctx.destination);

                         // Calculate Trim
                         const duration = audioBuffer.duration;
                         const startOffset = (row.trimStart || 0) * duration;
                         const endOffset = (row.trimEnd || 1) * duration;
                         let playDuration = Math.max(0, endOffset - startOffset);

                         // Apply Note Duration Gating
                         if (row.duration) {
                              const secondsPerBeat = 60.0 / tempo;
                              let noteDuration = 0.2;
                              if (row.duration === '16n') noteDuration = 0.25 * secondsPerBeat;
                              if (row.duration === '8n') noteDuration = 0.5 * secondsPerBeat;
                              if (row.duration === '4n') noteDuration = 1.0 * secondsPerBeat;
                              if (row.duration === '2n') noteDuration = 2.0 * secondsPerBeat;
                              if (row.duration === '1n') noteDuration = 4.0 * secondsPerBeat;

                              playDuration = Math.min(playDuration, noteDuration);
                         }

                         source.start(time, startOffset, playDuration);
                    })
                    .catch(e => console.error("Error playing sample", e));

          } else if (row.type === 'SYNTH') {
               const gain = ctx.createGain();
               gain.connect(ctx.destination);
               gain.gain.setValueAtTime(volume, time);

               if (row.instrumentPreset === 'KICK') {
                    const osc = ctx.createOscillator();
                    osc.connect(gain);
                    osc.frequency.setValueAtTime(150, time);
                    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
                    gain.gain.setValueAtTime(volume, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
                    osc.start(time);
                    osc.stop(time + 0.5);
               } else if (row.instrumentPreset === 'SNARE') {
                    const noise = ctx.createBufferSource();
                    const bufferSize = ctx.sampleRate;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                         data[i] = Math.random() * 2 - 1;
                    }
                    noise.buffer = buffer;

                    const noiseFilter = ctx.createBiquadFilter();
                    noiseFilter.type = 'highpass';
                    noiseFilter.frequency.value = 1000;
                    noise.connect(noiseFilter);
                    noiseFilter.connect(gain);

                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.connect(gain);

                    gain.gain.setValueAtTime(volume, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

                    noise.start(time);
                    osc.start(time);
                    noise.stop(time + 0.2);
                    osc.stop(time + 0.2);
               } else if (row.instrumentPreset === 'HIHAT') {
                    const bufferSize = ctx.sampleRate;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                         data[i] = Math.random() * 2 - 1;
                    }
                    const noise = ctx.createBufferSource();
                    noise.buffer = buffer;

                    const bandpass = ctx.createBiquadFilter();
                    bandpass.type = 'bandpass';
                    bandpass.frequency.value = 10000;

                    const highpass = ctx.createBiquadFilter();
                    highpass.type = 'highpass';
                    highpass.frequency.value = 7000;

                    noise.connect(bandpass);
                    bandpass.connect(highpass);
                    highpass.connect(gain);

                    gain.gain.setValueAtTime(volume * 0.6, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

                    noise.start(time);
                    noise.stop(time + 0.05);
               } else {
                    // DEFAULT SYNTH (Square Wave)
                    const osc = ctx.createOscillator();
                    osc.connect(gain);
                    osc.frequency.value = getFrequency(row.note || 'C4');
                    osc.type = 'square';

                    // Duration Logic
                    let noteDuration = 0.2; // Default 16th note approx
                    if (row.duration) {
                         const secondsPerBeat = 60.0 / tempo;
                         if (row.duration === '16n') noteDuration = 0.25 * secondsPerBeat;
                         if (row.duration === '8n') noteDuration = 0.5 * secondsPerBeat;
                         if (row.duration === '4n') noteDuration = 1.0 * secondsPerBeat;
                         if (row.duration === '2n') noteDuration = 2.0 * secondsPerBeat;
                         if (row.duration === '1n') noteDuration = 4.0 * secondsPerBeat;
                    }

                    gain.gain.setValueAtTime(0.1 * volume, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration);

                    osc.start(time);
                    osc.stop(time + noteDuration);
               }
          }
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
          stepRef.current = (stepRef.current + 1) % STEPS;
          setCurrentStep(stepRef.current);
     };

     const scheduleNote = (stepNumber: number, time: number) => {
          grid[stepNumber].forEach((isActive, rowIndex) => {
               if (isActive) {
                    playRowSound(rowIndex, time);
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
          const sequence: { note: number, time: number }[] = [];
          grid.forEach((stepNotes, step) => {
               stepNotes.forEach((isActive, rowIndex) => {
                    if (isActive) sequence.push({ note: rowIndex, time: step });
               });
          });

          const track: MusicTrack = {
               id: initialTrack?.id || Math.random().toString(36).substr(2, 9),
               name,
               type: 'GENERATED',
               data: '',
               sequence,
               rows
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
               duration: '16n'
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

     return (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center font-['Gochi_Hand'] backdrop-blur-sm p-4">
               <div className="sketch-box w-full max-w-[1400px] h-[90vh] flex flex-col gap-4 relative overflow-hidden text-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">

                    {/* HEADER */}
                    <div className="flex items-center justify-between border-b-[3px] border-black pb-4 bg-gray-50 p-4 rounded-t-xl shrink-0">
                         <div className="flex items-center gap-4">
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
                                                  <button onClick={() => setEditingRowId(row.id)} className="text-gray-400 hover:text-black"><Settings size={16} /></button>
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
                                   <div className="min-w-max flex flex-col gap-2">
                                        {rows.map((row, rowIndex) => (
                                             <div key={row.id} className="flex gap-1 h-[100px] bg-white rounded-xl border-2 border-black p-2 hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)] transition-all">
                                                  {Array(STEPS).fill(null).map((_, step) => {
                                                       const isActive = grid[step][rowIndex];
                                                       const isCurrent = currentStep === step;
                                                       const isBeat = step % 4 === 0;

                                                       // Determine Color
                                                       let bgClass = 'bg-white';
                                                       let borderClass = 'border-gray-100';

                                                       if (isActive) {
                                                            bgClass = row.color || 'bg-gray-200';
                                                            borderClass = 'border-black';
                                                       } else if (isBeat) {
                                                            bgClass = 'bg-gray-50';
                                                            borderClass = 'border-gray-200';
                                                       }

                                                       return (
                                                            <div
                                                                 key={step}
                                                                 onClick={() => {
                                                                      const newGrid = [...grid];
                                                                      newGrid[step][rowIndex] = !isActive;
                                                                      setGrid(newGrid);
                                                                      if (!isActive) playRowSound(rowIndex, audioCtxRef.current?.currentTime || 0);
                                                                 }}
                                                                 className={`
                                                                      w-16 h-full rounded-md cursor-pointer transition-all duration-75 border-2
                                                                      ${bgClass} ${borderClass}
                                                                      ${isActive ? 'shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transform -translate-y-[1px]' : 'hover:border-gray-400'}
                                                                      ${isCurrent ? 'ring-4 ring-purple-200 z-10' : ''}
                                                                 `}
                                                            />
                                                       );
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
                                        <div className="space-y-2">
                                             <label className="font-bold text-gray-500 text-sm uppercase tracking-wider flex items-center gap-2">
                                                  <Clock size={16} /> Duration
                                             </label>
                                             <select
                                                  value={editingRow.duration || '16n'}
                                                  onChange={(e) => updateRow(editingRow.id, { duration: e.target.value })}
                                                  className="w-full bg-white border-2 border-black rounded-lg p-3 font-bold text-black focus:border-purple-500 outline-none"
                                             >
                                                  <option value="16n">Short (1/16)</option>
                                                  <option value="8n">Medium (1/8)</option>
                                                  <option value="4n">Long (1/4)</option>
                                                  <option value="2n">Very Long (1/2)</option>
                                             </select>
                                        </div>

                                        {editingRow.type === 'SAMPLE' && (
                                             <div className="bg-gray-50 p-6 rounded-xl border-2 border-black flex flex-col gap-4 items-center">
                                                  <div className="w-full flex justify-center">
                                                       <button
                                                            onMouseDown={startRecording}
                                                            onMouseUp={stopRecording}
                                                            onMouseLeave={stopRecording}
                                                            onTouchStart={startRecording}
                                                            onTouchEnd={stopRecording}
                                                            className={`
                                                                 w-32 h-32 rounded-full border-[4px] border-black flex flex-col items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_black]
                                                                 ${isRecording ? 'bg-red-200 scale-95 translate-y-1 shadow-none' : 'bg-white hover:bg-gray-50 hover:scale-105'}
                                                            `}
                                                       >
                                                            {isRecording ? (
                                                                 <>
                                                                      <div className="w-10 h-10 bg-red-500 rounded-sm animate-pulse" />
                                                                      <span className="text-xs font-black text-red-900 tracking-widest">REC</span>
                                                                 </>
                                                            ) : (
                                                                 <>
                                                                      <Mic size={40} className="text-black" />
                                                                      <span className="text-xs font-bold text-gray-500">HOLD TO REC</span>
                                                                 </>
                                                            )}
                                                       </button>
                                                  </div>

                                                  {editingRow.sampleData ? (
                                                       <div className="w-full space-y-4">
                                                            <div className="flex items-center gap-3 w-full bg-white p-3 rounded-lg border-2 border-black shadow-sm">
                                                                 <button
                                                                      onClick={() => {
                                                                           const audio = new Audio(editingRow.sampleData);
                                                                           audio.play();
                                                                      }}
                                                                      className="p-3 bg-green-200 rounded-full hover:bg-green-300 text-black border-2 border-black shadow-[2px_2px_0px_black] active:translate-y-[2px] active:shadow-none transition-all"
                                                                 >
                                                                      <Play size={16} fill="currentColor" />
                                                                 </button>
                                                                 <div className="flex-1">
                                                                      <div className="text-xs font-bold text-gray-500 uppercase">Sample Recorded</div>
                                                                      <div className="text-sm font-bold text-black">{(editingRow.sampleData.length / 1024).toFixed(1)} KB</div>
                                                                 </div>
                                                                 <button
                                                                      onClick={() => updateRow(editingRow.id, { sampleData: undefined })}
                                                                      className="p-2 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                                 >
                                                                      <Trash2 size={20} />
                                                                 </button>
                                                            </div>

                                                            {/* TRIM CONTROLS */}
                                                            <div className="bg-white p-4 rounded-lg border-2 border-black space-y-3">
                                                                 <div className="flex items-center gap-2 font-bold text-sm text-gray-500">
                                                                      <Scissors size={16} /> TRIM AUDIO
                                                                 </div>

                                                                 <div className="relative w-full h-24 bg-gray-100 rounded border-2 border-black overflow-hidden select-none">
                                                                      <canvas
                                                                           ref={waveformCanvasRef}
                                                                           width={500}
                                                                           height={96}
                                                                           className="w-full h-full"
                                                                      />
                                                                      {/* Overlay for Trim Start */}
                                                                      <div
                                                                           className="absolute top-0 left-0 h-full bg-black/50 pointer-events-none border-r-2 border-red-500"
                                                                           style={{ width: `${(editingRow.trimStart || 0) * 100}%` }}
                                                                      />
                                                                      {/* Overlay for Trim End */}
                                                                      <div
                                                                           className="absolute top-0 right-0 h-full bg-black/50 pointer-events-none border-l-2 border-red-500"
                                                                           style={{ width: `${(1 - (editingRow.trimEnd || 1)) * 100}%` }}
                                                                      />
                                                                 </div>

                                                                 <div className="space-y-4">
                                                                      <div className="space-y-1">
                                                                           <div className="flex justify-between text-xs font-bold">
                                                                                <span>START</span>
                                                                                <span>{Math.round((editingRow.trimStart || 0) * 100)}%</span>
                                                                           </div>
                                                                           <input
                                                                                type="range" min="0" max="1" step="0.01"
                                                                                value={editingRow.trimStart || 0}
                                                                                onChange={(e) => updateRow(editingRow.id, { trimStart: Math.min(parseFloat(e.target.value), (editingRow.trimEnd || 1) - 0.1) })}
                                                                                className="w-full accent-green-500"
                                                                           />
                                                                      </div>
                                                                      <div className="space-y-1">
                                                                           <div className="flex justify-between text-xs font-bold">
                                                                                <span>END</span>
                                                                                <span>{Math.round((editingRow.trimEnd || 1) * 100)}%</span>
                                                                           </div>
                                                                           <input
                                                                                type="range" min="0" max="1" step="0.01"
                                                                                value={editingRow.trimEnd || 1}
                                                                                onChange={(e) => updateRow(editingRow.id, { trimEnd: Math.max(parseFloat(e.target.value), (editingRow.trimStart || 0) + 0.1) })}
                                                                                className="w-full accent-red-500"
                                                                           />
                                                                      </div>
                                                                 </div>
                                                            </div>
                                                       </div>
                                                  ) : (
                                                       <div className="text-sm text-gray-400 italic">No sample recorded yet</div>
                                                  )}
                                             </div>
                                        )}

                                        {editingRow.type === 'SYNTH' && (
                                             <div className="space-y-4">
                                                  <div className="space-y-2">
                                                       <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Note</label>
                                                       <select
                                                            value={editingRow.note}
                                                            onChange={(e) => updateRow(editingRow.id, { note: e.target.value, name: e.target.value, instrumentPreset: 'DEFAULT' })}
                                                            className="w-full bg-white border-2 border-black rounded-lg p-3 font-bold text-black focus:border-purple-500 outline-none"
                                                       >
                                                            {NOTES.flatMap(n => OCTAVES.map(o => `${n}${o}`)).reverse().map(note => (
                                                                 <option key={note} value={note}>{note}</option>
                                                            ))}
                                                       </select>
                                                  </div>

                                                  <div className="space-y-2">
                                                       <label className="font-bold text-gray-500 text-sm uppercase tracking-wider">Preset</label>
                                                       <div className="flex gap-2">
                                                            {['KICK', 'SNARE', 'HIHAT', 'BASS'].map(preset => (
                                                                 <button
                                                                      key={preset}
                                                                      onClick={() => updateRow(editingRow.id, { instrumentPreset: preset as any, name: preset })}
                                                                      className={`flex-1 py-2 text-xs font-bold border-2 border-black rounded-lg ${editingRow.instrumentPreset === preset ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                                                                 >
                                                                      {preset}
                                                                 </button>
                                                            ))}
                                                       </div>
                                                  </div>
                                             </div>
                                        )}
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
          </div>
     );
};
