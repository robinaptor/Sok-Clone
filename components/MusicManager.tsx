import React, { useState, useRef } from 'react';
import { X, Upload, Music, Plus, Trash2, Play, Square } from 'lucide-react';
import { GameData, MusicTrack } from '../types';
import { MusicCreator } from './MusicCreator';

interface MusicManagerProps {
     gameData: GameData;
     onUpdateMusic: (music: MusicTrack[]) => void;
     onClose: () => void;
}

export const MusicManager: React.FC<MusicManagerProps> = ({ gameData, onUpdateMusic, onClose }) => {
     const [showCreator, setShowCreator] = useState(false);
     const [editingTrack, setEditingTrack] = useState<MusicTrack | undefined>(undefined);
     const [playingId, setPlayingId] = useState<string | null>(null);
     const audioRef = useRef<HTMLAudioElement | null>(null);

     const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
               const result = event.target?.result as string;
               const newTrack: MusicTrack = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    data: result,
                    type: 'UPLOAD'
               };
               onUpdateMusic([...(gameData.music || []), newTrack]);
          };
          reader.readAsDataURL(file);
     };

     const handlePlayPreview = (track: MusicTrack) => {
          if (playingId === track.id) {
               audioRef.current?.pause();
               setPlayingId(null);
          } else {
               if (audioRef.current) audioRef.current.pause();

               if (track.type === 'UPLOAD') {
                    audioRef.current = new Audio(track.data);
                    audioRef.current.play();
                    audioRef.current.onended = () => setPlayingId(null);
               } else if (track.type === 'GENERATED' && track.sequence) {
                    // GENERATED MUSIC PLAYBACK
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContextClass();

                    // Resume context if suspended
                    if (ctx.state === 'suspended') {
                         ctx.resume();
                    }

                    const tempo = track.tempo || 120;
                    const secondsPerBeat = 60.0 / tempo;
                    const stepDuration = 0.25 * secondsPerBeat; // 16th notes
                    const lookahead = 25.0; // ms
                    const scheduleAheadTime = 0.1; // s

                    let nextNoteTime = ctx.currentTime;
                    let currentStep = 0;
                    const steps = track.steps || 16;
                    let isPlaying = true;

                    const getFrequency = (noteName: string) => {
                         const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
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
                         const row = track.rows?.[rowIndex];
                         if (!row) return;

                         if (row.isMuted) return;

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
                                                  playbackRate = sampleDuration / noteDuration;
                                             }

                                             source.playbackRate.value = playbackRate;

                                             source.start(time, startOffset, noteDuration + release);
                                        })
                                        .catch(e => console.error("Error playing sample", e));
                              } else if (row.type === 'SYNTH') {
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
                    // Scheduler function
                    const scheduler = () => {
                         if (!isPlaying) return;

                         while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
                              // Schedule notes for current step
                              const notesInStep = track.sequence!.filter(n => n.time === currentStep);
                              notesInStep.forEach(note => {
                                   // Get melody note if available
                                   const row = track.rows?.[note.note];
                                   const melodyNotes = row?.notes?.[currentStep]; // This can be a string or string[] for polyphony

                                   playRowSound(note.note, nextNoteTime, note.duration || 1, melodyNotes);
                              });

                              // Advance step
                              nextNoteTime += stepDuration;
                              currentStep = (currentStep + 1) % steps;
                         }
                    };

                    scheduler();

                    // Store context in ref to close it later
                    (audioRef as any).current = {
                         pause: () => {
                              isPlaying = false;
                              ctx.close();
                         },
                         play: () => { }
                    };
               }
               setPlayingId(track.id);
          }
     };

     const handleDelete = (id: string) => {
          if (confirm("Delete this track?")) {
               onUpdateMusic((gameData.music || []).filter(t => t.id !== id));
          }
     };

     if (showCreator) {
          return (
               <MusicCreator
                    initialTrack={editingTrack}
                    onSave={(track) => {
                         if (editingTrack) {
                              onUpdateMusic((gameData.music || []).map(t => t.id === track.id ? track : t));
                         } else {
                              onUpdateMusic([...(gameData.music || []), track]);
                         }
                         setShowCreator(false);
                         setEditingTrack(undefined);
                    }}
                    onCancel={() => {
                         setShowCreator(false);
                         setEditingTrack(undefined);
                    }}
               />
          );
     }

     return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center font-['Gochi_Hand']">
               <div className="bg-[#fdfbf7] p-6 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] border-[4px] border-black w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col gap-4 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    <div className="flex items-center justify-between border-b-[3px] border-black pb-4 relative z-10">
                         <h2 className="text-3xl font-black flex items-center gap-2 rotate-[-1deg]">
                              <div className="bg-purple-100 p-2 rounded-lg border-2 border-black">
                                   <Music className="text-purple-600" size={28} />
                              </div>
                              MUSIC MANAGER
                         </h2>
                         <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
                              <X size={28} />
                         </button>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-[300px] p-2 relative z-10">
                         {(gameData.music || []).length === 0 && (
                              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                                   <Music size={48} className="opacity-20" />
                                   <p className="text-xl font-bold">No music tracks yet.</p>
                              </div>
                         )}

                         {(gameData.music || []).map(track => (
                              <div key={track.id} className="flex items-center justify-between bg-white p-3 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] transition-all group">
                                   <div className="flex items-center gap-3">
                                        <button
                                             onClick={() => handlePlayPreview(track)}
                                             className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center transition-transform hover:scale-110 ${playingId === track.id ? 'bg-red-400 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                                        >
                                             {playingId === track.id ? <Square size={18} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                        </button>
                                        <div>
                                             <div className="font-bold text-lg leading-none">{track.name}</div>
                                             <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1 border border-gray-300">{track.type}</div>
                                        </div>
                                   </div>
                                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {track.type === 'GENERATED' && (
                                             <button
                                                  onClick={() => { setEditingTrack(track); setShowCreator(true); }}
                                                  className="bg-blue-100 text-blue-600 hover:bg-blue-200 border-2 border-black rounded-lg p-2 font-bold text-xs"
                                                  title="Edit Track"
                                             >
                                                  EDIT
                                             </button>
                                        )}
                                        <button
                                             onClick={() => handleDelete(track.id)}
                                             className="bg-red-100 text-red-500 hover:bg-red-200 border-2 border-black rounded-lg p-2"
                                             title="Delete Track"
                                        >
                                             <Trash2 size={18} />
                                        </button>
                                   </div>
                              </div>
                         ))}
                    </div>

                    <div className="flex gap-4 pt-4 border-t-[3px] border-black relative z-10">
                         <label className="flex-1 cursor-pointer group">
                              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                              <div className="w-full py-3 bg-blue-50 border-[3px] border-blue-300 border-dashed rounded-xl flex items-center justify-center gap-2 text-blue-600 font-bold group-hover:bg-blue-100 group-hover:border-blue-500 transition-all text-lg">
                                   <Upload size={24} /> UPLOAD MP3
                              </div>
                         </label>
                         <button
                              onClick={() => { setEditingTrack(undefined); setShowCreator(true); }}
                              className="flex-1 py-3 bg-purple-400 text-white border-[3px] border-black rounded-xl flex items-center justify-center gap-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-lg rotate-1 hover:rotate-2"
                         >
                              <Plus size={24} /> CREATE NEW
                         </button>
                    </div>
               </div>
          </div>
     );
};
