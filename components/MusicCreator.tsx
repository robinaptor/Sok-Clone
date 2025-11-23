import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Save, Trash2, Plus, Music } from 'lucide-react';
import { MusicTrack } from '../types';

interface MusicCreatorProps {
     onSave: (track: MusicTrack) => void;
     onCancel: () => void;
     initialTrack?: MusicTrack;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [4, 5]; // 2 Octaves
const STEPS = 16;

export const MusicCreator: React.FC<MusicCreatorProps> = ({ onSave, onCancel, initialTrack }) => {
     const [name, setName] = useState(initialTrack?.name || "New Song");
     const [tempo, setTempo] = useState(120);
     // Grid: [step][noteIndex] -> boolean
     const [grid, setGrid] = useState<boolean[][]>(
          initialTrack?.sequence
               ? Array(STEPS).fill(null).map((_, step) => {
                    const stepNotes = Array(NOTES.length * OCTAVES.length).fill(false);
                    initialTrack.sequence?.filter(n => n.time === step).forEach(n => {
                         stepNotes[n.note] = true;
                    });
                    return stepNotes;
               })
               : Array(STEPS).fill(null).map(() => Array(NOTES.length * OCTAVES.length).fill(false))
     );
     const [isPlaying, setIsPlaying] = useState(false);
     const [currentStep, setCurrentStep] = useState(0);

     const audioCtxRef = useRef<AudioContext | null>(null);
     const nextNoteTimeRef = useRef(0);
     const timerIDRef = useRef<number | null>(null);
     const stepRef = useRef(0);

     useEffect(() => {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          return () => {
               if (audioCtxRef.current) audioCtxRef.current.close();
          };
     }, []);

     const playNote = (noteIndex: number, time: number) => {
          if (!audioCtxRef.current) return;
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();

          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);

          // Calculate frequency
          // Base C4 = 261.63 Hz
          const baseFreq = 261.63;
          const freq = baseFreq * Math.pow(2, noteIndex / 12);

          osc.frequency.value = freq;
          osc.type = 'square'; // Retro sound

          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

          osc.start(time);
          osc.stop(time + 0.2);
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
          grid[stepNumber].forEach((isActive, noteIndex) => {
               if (isActive) {
                    playNote(noteIndex, time);
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
               stepNotes.forEach((isActive, note) => {
                    if (isActive) sequence.push({ note, time: step });
               });
          });

          const track: MusicTrack = {
               id: initialTrack?.id || Math.random().toString(36).substr(2, 9),
               name,
               type: 'GENERATED',
               data: '', // Not used for generated
               sequence
          };
          onSave(track);
     };

     const allNotes = [];
     for (let o = 0; o < OCTAVES.length; o++) {
          for (let n = 0; n < NOTES.length; n++) {
               allNotes.push({ name: NOTES[n], octave: OCTAVES[o], index: o * 12 + n });
          }
     }
     // Reverse to have high notes on top
     allNotes.reverse();

     return (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center font-['Gochi_Hand']">
               <div className="bg-[#fdfbf7] p-6 rounded-2xl shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] border-[4px] border-black w-[90vw] max-w-4xl h-[90vh] flex flex-col gap-4 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    {/* HEADER */}
                    <div className="flex items-center justify-between border-b-[3px] border-black pb-4 relative z-10">
                         <div className="flex items-center gap-4">
                              <div className="bg-purple-100 p-2 rounded-lg border-2 border-black rotate-[-3deg]">
                                   <Music className="text-purple-600" size={32} />
                              </div>
                              <input
                                   type="text"
                                   value={name}
                                   onChange={(e) => setName(e.target.value)}
                                   className="bg-transparent text-3xl font-bold text-black border-b-2 border-black border-dashed focus:border-purple-500 outline-none placeholder-gray-400"
                                   placeholder="Song Name"
                              />
                         </div>
                         <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-xl border-2 border-black shadow-sm rotate-1">
                                   <span className="text-black font-bold text-lg">TEMPO</span>
                                   <input
                                        type="range"
                                        min="60"
                                        max="240"
                                        value={tempo}
                                        onChange={(e) => setTempo(Number(e.target.value))}
                                        className="w-24 accent-purple-500 cursor-pointer"
                                   />
                                   <span className="text-purple-600 font-black w-8 text-right text-xl">{tempo}</span>
                              </div>
                              <button
                                   onClick={togglePlay}
                                   className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none ${isPlaying ? 'bg-red-400 hover:bg-red-500' : 'bg-green-400 hover:bg-green-500'}`}
                              >
                                   {isPlaying ? <Square fill="white" size={24} /> : <Play fill="white" size={28} className="ml-1" />}
                              </button>
                         </div>
                    </div>

                    {/* SEQUENCER GRID */}
                    <div className="flex-1 overflow-auto bg-white rounded-xl border-[3px] border-black relative shadow-inner z-10">
                         <div className="flex min-w-max">
                              {/* PIANO ROLL KEYS */}
                              <div className="sticky left-0 z-20 bg-gray-100 border-r-[3px] border-black shadow-md">
                                   {allNotes.map((note) => (
                                        <div
                                             key={note.index}
                                             className={`h-8 w-16 flex items-center justify-end pr-2 text-sm font-bold border-b border-gray-300 ${note.name.includes('#') ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                                        >
                                             {note.name}{note.octave}
                                        </div>
                                   ))}
                              </div>

                              {/* GRID */}
                              <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                                   {allNotes.map((note) => (
                                        <div key={note.index} className="flex h-8">
                                             {Array(STEPS).fill(null).map((_, step) => {
                                                  const isActive = grid[step][note.index];
                                                  const isCurrent = currentStep === step;
                                                  return (
                                                       <div
                                                            key={step}
                                                            onClick={() => {
                                                                 const newGrid = [...grid];
                                                                 newGrid[step][note.index] = !isActive;
                                                                 setGrid(newGrid);
                                                                 if (!isActive) playNote(note.index, audioCtxRef.current?.currentTime || 0);
                                                            }}
                                                            className={`
                                                    flex-1 border-r border-b border-gray-200 cursor-pointer transition-all duration-100
                                                    ${isActive ? 'bg-purple-500 border-purple-600 shadow-sm transform scale-90 rounded-sm' : (step % 4 === 0 ? 'bg-gray-50' : '')}
                                                    ${isCurrent ? 'bg-yellow-200/50' : ''}
                                                    hover:bg-purple-200
                                                `}
                                                       />
                                                  );
                                             })}
                                        </div>
                                   ))}
                              </div>
                         </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex justify-end gap-4 pt-4 border-t-[3px] border-black relative z-10">
                         <button onClick={onCancel} className="px-6 py-2 rounded-xl border-[3px] border-black text-black hover:bg-gray-100 font-bold flex items-center gap-2 text-xl hover:rotate-[-1deg] transition-transform">
                              <X size={24} /> CANCEL
                         </button>
                         <button onClick={handleSave} className="px-8 py-2 rounded-xl bg-purple-400 text-white border-[3px] border-black hover:bg-purple-500 font-bold flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-xl rotate-1">
                              <Save size={24} /> SAVE TRACK
                         </button>
                    </div>
               </div>
          </div>
     );
};
