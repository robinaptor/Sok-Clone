import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Upload, X, Save, Trash2, Volume2, Sliders, Zap } from 'lucide-react';

interface SoundRecorderProps {
  onSave: (base64Audio: string) => void;
  onClose: () => void;
}

// --- AUDIO HELPERS ---

// Create a distortion curve for the WaveShaper
const makeDistortionCurve = (amount: number) => {
  const k = amount;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Sigmoid distortion function
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

// Improved WAV Encoder
const bufferToWav = (abuffer: AudioBuffer, len: number) => {
  let numOfChan = abuffer.numberOfChannels;
  let length = len * numOfChan * 2 + 44;
  let buffer = new ArrayBuffer(length);
  let view = new DataView(buffer);
  let channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this encoder)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < len) {
    for(i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([buffer], { type: "audio/wav" });

  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

export const SoundRecorder: React.FC<SoundRecorderProps> = ({ onSave, onClose }) => {
  const [mode, setMode] = useState<'RECORD' | 'UPLOAD'>('RECORD');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  // Keep track of the original RAW recording to apply effects non-destructively
  const [originalAudioBuffer, setOriginalAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const [visuals, setVisuals] = useState<number[]>(new Array(20).fill(10));
  
  // --- FX STATE ---
  const [pitch, setPitch] = useState(1.0); // Playback Rate (0.5 - 2.0)
  const [crunch, setCrunch] = useState(0); // Distortion (0 - 100)
  const [volume, setVolume] = useState(1.0); // Gain (0 - 2.0)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number>(0);
  const isHoldingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Init AudioContext
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // --- RECORDING LOGIC ---
  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); 
    if (isRecording) return;
    isHoldingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!isHoldingRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Create initial blob
        setAudioBlob(blob);
        
        // Decode immediately for processing
        try {
            const arrayBuffer = await blob.arrayBuffer();
            if (audioContextRef.current) {
                // Ensure context is running
                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }
                const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                setOriginalAudioBuffer(decodedBuffer);
            }
        } catch (err) {
            console.error("Error decoding audio data:", err);
            alert("Failed to process audio. Please try again.");
        }

        stopVisualizer();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startVisualizer();

    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Could not access microphone. Please check permissions.");
      setIsRecording(false);
      isHoldingRef.current = false;
    }
  };

  const stopRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isHoldingRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(false);
    }
  };

  // --- VISUALIZER ---
  const startVisualizer = () => {
      const animate = () => {
          setVisuals(prev => prev.map(() => Math.random() * 40 + 5));
          animationRef.current = requestAnimationFrame(animate);
      };
      animate();
  };

  const stopVisualizer = () => {
      cancelAnimationFrame(animationRef.current);
      setVisuals(new Array(20).fill(5));
  };

  // --- UPLOAD LOGIC ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && audioContextRef.current) {
          setAudioBlob(file);
          try {
              const arrayBuffer = await file.arrayBuffer();
              const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
              setOriginalAudioBuffer(decodedBuffer);
          } catch (e) {
              alert("Could not decode audio file.");
          }
      }
  };

  // --- PREVIEW WITH EFFECTS ---
  const playPreview = async () => {
      if (!originalAudioBuffer || !audioContextRef.current) return;

      try {
          // Resume context if needed
          if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
          }

          // Stop existing
          if (previewSourceRef.current) {
              try { previewSourceRef.current.stop(); } catch(e){}
          }

          const ctx = audioContextRef.current;
          const source = ctx.createBufferSource();
          source.buffer = originalAudioBuffer;
          
          // 1. Pitch (Playback Rate)
          source.playbackRate.value = pitch;

          // 2. Distortion
          const distortion = ctx.createWaveShaper();
          distortion.curve = makeDistortionCurve(crunch);
          distortion.oversample = '4x';

          // 3. Volume
          const gainNode = ctx.createGain();
          gainNode.gain.value = volume;

          // Connect Graph
          source.connect(distortion);
          distortion.connect(gainNode);
          gainNode.connect(ctx.destination);

          source.onended = () => setIsPlayingPreview(false);
          
          previewSourceRef.current = source;
          source.start();
          setIsPlayingPreview(true);
      } catch (e) {
          console.error("Playback failed:", e);
      }
  };

  const stopPreview = () => {
      if (previewSourceRef.current) {
          try { previewSourceRef.current.stop(); } catch(e){}
          setIsPlayingPreview(false);
      }
  };

  // --- RENDER & SAVE FINAL AUDIO ---
  const handleSave = async () => {
      if (!originalAudioBuffer) return;

      try {
          // Offline Context to bake effects
          const newDuration = originalAudioBuffer.duration / pitch;
          const offlineCtx = new OfflineAudioContext(
              originalAudioBuffer.numberOfChannels,
              newDuration * originalAudioBuffer.sampleRate,
              originalAudioBuffer.sampleRate
          );

          const source = offlineCtx.createBufferSource();
          source.buffer = originalAudioBuffer;
          source.playbackRate.value = pitch;

          const distortion = offlineCtx.createWaveShaper();
          distortion.curve = makeDistortionCurve(crunch);
          distortion.oversample = '4x';

          const gainNode = offlineCtx.createGain();
          gainNode.gain.value = volume;

          source.connect(distortion);
          distortion.connect(gainNode);
          gainNode.connect(offlineCtx.destination);

          source.start();

          const renderedBuffer = await offlineCtx.startRendering();
          const wavBlob = bufferToWav(renderedBuffer, renderedBuffer.length);

          // Create base64 string
          const reader = new FileReader();
          reader.readAsDataURL(wavBlob);
          reader.onloadend = () => {
              const base64 = reader.result as string;
              onSave(base64);
          };
      } catch (e) {
          console.error("Failed to process/save audio:", e);
          alert("Error saving audio. Try again.");
      }
  };

  // --- PRESETS ---
  const applyPreset = (p: 'CHIPMUNK' | 'MONSTER' | 'RADIO' | 'RESET') => {
      switch(p) {
          case 'CHIPMUNK':
              setPitch(1.5);
              setCrunch(0);
              setVolume(1.0);
              break;
          case 'MONSTER':
              setPitch(0.6);
              setCrunch(50); // Some distortion
              setVolume(1.2);
              break;
          case 'RADIO':
              setPitch(1.0);
              setCrunch(200); // Heavy distortion
              setVolume(0.8);
              break;
          case 'RESET':
              setPitch(1.0);
              setCrunch(0);
              setVolume(1.0);
              break;
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#f0fdf4] border-[4px] border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] w-[400px] overflow-hidden flex flex-col font-['Space_Mono']">
            
            {/* HEADER */}
            <div className="bg-[#22c55e] p-3 border-b-[4px] border-black flex justify-between items-center">
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <span className="bg-black text-[#22c55e] p-1 rounded text-xs">MIC</span> 
                    FLIP-SOUND
                </h2>
                <button onClick={onClose} className="hover:bg-black/20 rounded p-1 transition-colors">
                    <X size={24} strokeWidth={3} />
                </button>
            </div>

            {/* SCREEN AREA */}
            <div className="p-6 flex flex-col items-center bg-[radial-gradient(#dcfce7_1px,transparent_1px)] bg-[length:10px_10px] max-h-[70vh] overflow-y-auto">
                
                {/* VISUALIZER SCREEN */}
                <div className="w-full h-24 bg-[#14532d] border-[3px] border-black rounded-lg mb-4 relative flex items-center justify-center px-4 gap-1 overflow-hidden shadow-inner shrink-0">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_9px,rgba(0,255,0,0.1)_10px),linear-gradient(90deg,transparent_9px,rgba(0,255,0,0.1)_10px)] bg-[length:10px_10px] pointer-events-none"></div>
                    
                    {visuals.map((h, i) => (
                        <div 
                            key={i} 
                            className="flex-1 bg-[#4ade80] rounded-sm transition-all duration-75"
                            style={{ height: `${h}px` }}
                        />
                    ))}
                    {!audioBlob && !isRecording && (
                        <div className="absolute text-[#4ade80] font-bold opacity-50 animate-pulse">
                            READY TO RECORD
                        </div>
                    )}
                </div>

                {/* MODE TABS */}
                {!audioBlob && (
                    <div className="flex w-full mb-4 border-2 border-black rounded overflow-hidden shrink-0">
                        <button 
                            onClick={() => setMode('RECORD')}
                            className={`flex-1 py-1 font-bold text-sm ${mode === 'RECORD' ? 'bg-[#22c55e] text-white' : 'bg-white hover:bg-gray-100'}`}
                        >
                            REC
                        </button>
                        <button 
                            onClick={() => setMode('UPLOAD')}
                            className={`flex-1 py-1 font-bold text-sm ${mode === 'UPLOAD' ? 'bg-[#22c55e] text-white' : 'bg-white hover:bg-gray-100'}`}
                        >
                            UPLOAD
                        </button>
                    </div>
                )}

                {/* MAIN CONTROLS */}
                {!audioBlob && (
                    <div className="flex items-center justify-center gap-6 w-full">
                        {mode === 'RECORD' ? (
                            <button 
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording} 
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                className={`w-20 h-20 rounded-full border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_black] active:translate-y-1 active:shadow-none transition-all ${isRecording ? 'bg-red-600 scale-95' : 'bg-red-500 hover:bg-red-400'}`}
                            >
                                {isRecording ? <Square fill="white" stroke="none" /> : <div className="w-8 h-8 bg-white rounded-full"></div>}
                            </button>
                        ) : (
                            <label className="w-20 h-20 rounded-full border-[3px] border-black flex flex-col items-center justify-center bg-blue-200 hover:bg-blue-300 shadow-[3px_3px_0px_black] cursor-pointer active:translate-y-1 active:shadow-none">
                                <Upload size={24} />
                                <span className="text-[10px] font-bold">FILE</span>
                                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        )}
                    </div>
                )}

                {/* EDITOR INTERFACE (Visible after recording) */}
                {audioBlob && (
                    <div className="w-full flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                        
                        <div className="flex gap-4 justify-center">
                             <button 
                                onClick={isPlayingPreview ? stopPreview : playPreview}
                                className={`w-14 h-14 rounded-full border-2 border-black flex items-center justify-center hover:scale-110 transition-transform shadow-md ${isPlayingPreview ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}
                            >
                                {isPlayingPreview ? <Square fill="black" size={16}/> : <Play fill="black" size={20} />}
                            </button>
                            <button 
                                onClick={() => { 
                                    stopPreview();
                                    setAudioBlob(null); 
                                    setOriginalAudioBuffer(null); 
                                    setPitch(1.0);
                                    setCrunch(0);
                                    setVolume(1.0);
                                }}
                                className="w-14 h-14 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center hover:bg-red-200 transition-colors shadow-md text-gray-500 hover:text-red-500"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* EFFECTS CONTROLS */}
                        <div className="bg-white/50 p-3 rounded border-2 border-black/10 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xs text-gray-500 flex items-center gap-1"><Sliders size={12}/> EFFECTS</h3>
                                <div className="flex gap-1">
                                    <button onClick={() => applyPreset('CHIPMUNK')} className="px-2 py-0.5 bg-blue-100 border border-black rounded text-[10px] font-bold hover:bg-blue-200">CHIPMUNK</button>
                                    <button onClick={() => applyPreset('MONSTER')} className="px-2 py-0.5 bg-purple-100 border border-black rounded text-[10px] font-bold hover:bg-purple-200">MONSTER</button>
                                    <button onClick={() => applyPreset('RADIO')} className="px-2 py-0.5 bg-gray-200 border border-black rounded text-[10px] font-bold hover:bg-gray-300">RADIO</button>
                                </div>
                            </div>

                            {/* SPEED / PITCH */}
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span>SPEED / PITCH</span>
                                    <span>{Math.round(pitch * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="2.0" step="0.1" 
                                    value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))}
                                    className="w-full accent-[#22c55e] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer border border-black"
                                />
                            </div>

                            {/* CRUNCH */}
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span>CRUNCH</span>
                                    <span>{crunch > 0 ? Math.round(crunch) : 'OFF'}</span>
                                </div>
                                <input 
                                    type="range" min="0" max="400" step="10" 
                                    value={crunch} onChange={(e) => setCrunch(parseFloat(e.target.value))}
                                    className="w-full accent-[#ef4444] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer border border-black"
                                />
                            </div>

                            {/* VOLUME */}
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span>VOLUME</span>
                                    <span>{Math.round(volume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="2.0" step="0.1" 
                                    value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full accent-[#3b82f6] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer border border-black"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'RECORD' && !audioBlob && <p className="text-[10px] mt-2 text-gray-500 font-bold select-none">HOLD BUTTON TO RECORD</p>}

            </div>

            {/* FOOTER SAVE */}
            <div className="p-3 bg-gray-100 border-t-[4px] border-black flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={!audioBlob}
                    className={`sketch-btn px-6 py-2 font-bold flex items-center gap-2 ${!audioBlob ? 'opacity-50 cursor-not-allowed bg-gray-200' : 'bg-[#22c55e] hover:bg-green-400'}`}
                >
                    <Save size={18} /> SAVE SOUND
                </button>
            </div>

        </div>
    </div>
  );
};