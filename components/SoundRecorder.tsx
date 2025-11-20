
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Upload, X, Save, Trash2, Volume2 } from 'lucide-react';

interface SoundRecorderProps {
  onSave: (base64Audio: string) => void;
  onClose: () => void;
}

export const SoundRecorder: React.FC<SoundRecorderProps> = ({ onSave, onClose }) => {
  const [mode, setMode] = useState<'RECORD' | 'UPLOAD'>('RECORD');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [visuals, setVisuals] = useState<number[]>(new Array(20).fill(10));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number>(0);
  
  // REF TO TRACK IF BUTTON IS PHYSICALLY HELD (Solves Async Race Conditions)
  const isHoldingRef = useRef(false);

  // --- RECORDING LOGIC ---
  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent text selection or scrolling on mobile
    if (isRecording) return;
    
    isHoldingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // CRITICAL CHECK: If user released button while waiting for permission, ABORT.
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

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stopVisualizer();
        
        // Stop stream tracks to release mic
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
      // Case: Released before recording actually started (caught by the check in startRecording)
      setIsRecording(false);
    }
  };

  // --- VISUALIZER (FAKE FLIPNOTE VIBE) ---
  const startVisualizer = () => {
      const animate = () => {
          setVisuals(prev => prev.map(() => Math.random() * 40 + 5));
          animationRef.current = requestAnimationFrame(animate);
      };
      animate();
  };

  const stopVisualizer = () => {
      cancelAnimationFrame(animationRef.current);
      setVisuals(new Array(20).fill(5)); // Flat line
  };

  // --- UPLOAD LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setAudioBlob(file);
          setAudioUrl(URL.createObjectURL(file));
      }
  };

  // --- PLAYBACK ---
  const playAudio = () => {
      if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.play();
      }
  };

  // --- SAVE ---
  const handleSave = () => {
      if (!audioBlob) return;
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
          const base64 = reader.result as string;
          onSave(base64);
      };
  };

  useEffect(() => {
      return () => {
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          cancelAnimationFrame(animationRef.current);
      };
  }, [audioUrl]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in">
        {/* THE RETRO CONSOLE BOX */}
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
            <div className="p-6 flex flex-col items-center bg-[radial-gradient(#dcfce7_1px,transparent_1px)] bg-[length:10px_10px]">
                
                {/* VISUALIZER SCREEN */}
                <div className="w-full h-32 bg-[#14532d] border-[3px] border-black rounded-lg mb-4 relative flex items-center justify-center px-4 gap-1 overflow-hidden shadow-inner">
                    {/* Grid Overlay */}
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

                {/* TABS */}
                <div className="flex w-full mb-4 border-2 border-black rounded overflow-hidden">
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

                {/* CONTROLS */}
                <div className="flex items-center justify-center gap-6 w-full">
                    
                    {mode === 'RECORD' ? (
                        <button 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording} // Safety: Stop if mouse leaves button
                            // Touch events for mobile
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`w-20 h-20 rounded-full border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_black] active:translate-y-1 active:shadow-none transition-all ${isRecording ? 'bg-red-600 scale-95' : 'bg-red-500 hover:bg-red-400'}`}
                        >
                            {isRecording ? <Square fill="white" stroke="none" /> : <div className="w-8 h-8 bg-white rounded-full"></div>}
                        </button>
                    ) : (
                        <label className="w-20 h-20 rounded-full border-[3px] border-black flex items-col flex-col items-center justify-center bg-blue-200 hover:bg-blue-300 shadow-[3px_3px_0px_black] cursor-pointer active:translate-y-1 active:shadow-none">
                            <Upload size={24} />
                            <span className="text-[10px] font-bold">FILE</span>
                            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                    )}

                    {audioBlob && (
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={playAudio}
                                className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                            >
                                <Play fill="black" size={20} />
                            </button>
                            <button 
                                onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                                className="w-12 h-12 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center hover:bg-red-200 transition-colors shadow-sm text-gray-500 hover:text-red-500"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    )}

                </div>
                
                {mode === 'RECORD' && <p className="text-[10px] mt-2 text-gray-500 font-bold select-none">HOLD BUTTON TO RECORD</p>}

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
