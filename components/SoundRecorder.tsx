import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Upload, X, Save, Trash2, Volume2, Sliders, Zap } from 'lucide-react';

interface SoundRecorderProps {
    onSave: (base64Audio: string) => void;
    onClose: () => void;
    initialAudio?: string; // Base64 Data URL
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

// Simple WAV Encoder to save the processed AudioBuffer
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
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < len) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
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

export const SoundRecorder: React.FC<SoundRecorderProps> = ({ onSave, onClose, initialAudio }) => {
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
    const [isLoading, setIsLoading] = useState(false); // New loading state

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const animationRef = useRef<number>(0);
    const isHoldingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null); // New Analyser

    // Init AudioContext
    useEffect(() => {
        console.log("SoundRecorder: Mounting, init AudioContext");
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Load initial audio if present
        if (initialAudio) {
            const loadInitial = async () => {
                console.log("SoundRecorder: Loading initial audio...");
                setIsLoading(true);
                try {
                    // Handle potential missing data URI prefix
                    const src = initialAudio.startsWith('data:') ? initialAudio : `data:audio/wav;base64,${initialAudio}`;
                    const res = await fetch(src);
                    const blob = await res.blob();
                    console.log("SoundRecorder: Blob loaded", blob.type, blob.size);
                    setAudioBlob(blob);

                    const arrayBuffer = await blob.arrayBuffer();
                    if (audioContextRef.current) {
                        console.log("SoundRecorder: Decoding audio data...");
                        const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                        console.log("SoundRecorder: Audio decoded successfully", decodedBuffer.duration, "seconds");
                        setOriginalAudioBuffer(decodedBuffer);
                    }
                } catch (e) {
                    console.error("SoundRecorder: Failed to load initial audio", e);
                    alert("Error loading sound: " + e);
                } finally {
                    setIsLoading(false);
                }
            };
            loadInitial();
        }

        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
            cancelAnimationFrame(animationRef.current);
        };
    }, [initialAudio]);

    // --- RECORDING LOGIC ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(audioBlob);

                // Decode for effects
                const arrayBuffer = await audioBlob.arrayBuffer();
                if (audioContextRef.current) {
                    const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                    setOriginalAudioBuffer(decodedBuffer);
                }

                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            startVisualizer('RECORD');

            // Animation for holding button
            isHoldingRef.current = true;
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            stopVisualizer();
            isHoldingRef.current = false;
        }
    };

    // ... (Visualizer & Preview Helpers) ...

    // --- VISUALIZER & PREVIEW HELPERS ---
    const stopVisualizer = () => {
        cancelAnimationFrame(animationRef.current);
        setVisuals(new Array(20).fill(10));
    };

    const startVisualizer = (visMode: 'RECORD' | 'PLAYBACK') => {
        stopVisualizer();
        const animate = () => {
            if (visMode === 'PLAYBACK' && analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                // Simple downsample to 20 bars
                const step = Math.floor(dataArray.length / 20);
                const newVisuals = Array.from({ length: 20 }, (_, i) => {
                    const val = dataArray[i * step] || 0;
                    return (val / 255) * 100;
                });
                setVisuals(newVisuals);
            } else {
                // Fake visuals for recording (random noise)
                setVisuals(prev => prev.map(() => Math.random() * 50 + 20));
            }
            animationRef.current = requestAnimationFrame(animate);
        };
        animate();
    };

    const stopPreview = () => {
        if (previewSourceRef.current) {
            try { previewSourceRef.current.stop(); } catch (e) { }
            previewSourceRef.current = null;
        }
        setIsPlayingPreview(false);
        stopVisualizer();
    };

    // --- PREVIEW WITH EFFECTS ---
    const playPreview = async () => {
        console.log("SoundRecorder: playPreview called");
        if (!originalAudioBuffer || !audioContextRef.current) {
            console.error("SoundRecorder: No buffer or context", { buffer: !!originalAudioBuffer, context: !!audioContextRef.current });
            return;
        }

        const ctx = audioContextRef.current;

        // CRITICAL FIX: Resume context if suspended
        if (ctx.state === 'suspended') {
            console.log("SoundRecorder: Resuming suspended context...");
            await ctx.resume();
            console.log("SoundRecorder: Context resumed, state:", ctx.state);
        }

        // Stop existing
        if (previewSourceRef.current) {
            try { previewSourceRef.current.stop(); } catch (e) { }
        }

        try {
            const source = ctx.createBufferSource();
            source.buffer = originalAudioBuffer;

            // 1. Pitch
            source.playbackRate.value = pitch;

            // 2. Distortion
            const distortion = ctx.createWaveShaper();
            distortion.curve = makeDistortionCurve(crunch);
            distortion.oversample = '4x';

            // 3. Volume
            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;

            // 4. Analyser
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            // Connect Graph
            source.connect(distortion);
            distortion.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(ctx.destination);

            source.onended = () => {
                console.log("SoundRecorder: Playback ended");
                setIsPlayingPreview(false);
                stopVisualizer();
            };

            previewSourceRef.current = source;
            source.start();
            console.log("SoundRecorder: Playback started");
            setIsPlayingPreview(true);
            startVisualizer('PLAYBACK');
        } catch (err) {
            console.error("SoundRecorder: Error during playback setup", err);
        }
    };
    // --- RENDER & SAVE FINAL AUDIO ---
    const handleSave = async () => {
        if (!originalAudioBuffer) return;

        // Offline Context to bake effects
        // Calculate new duration based on pitch (faster speed = shorter duration)
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

        const reader = new FileReader();
        reader.readAsDataURL(wavBlob);
        reader.onloadend = () => {
            const base64 = reader.result as string;
            onSave(base64);
        };
    };

    // --- PRESETS ---
    const applyPreset = (p: 'CHIPMUNK' | 'MONSTER' | 'RADIO' | 'RESET') => {
        switch (p) {
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-mono">
            <div className="bg-[#f0fdf4] rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col overflow-hidden border-4 border-black">
                {/* HEADER */}
                <div className="p-3 bg-[#22c55e] border-b-4 border-black flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-black text-[#22c55e] px-1.5 py-0.5 text-xs font-bold rounded-sm">MIC</div>
                        <h2 className="text-lg font-black tracking-tight">SOUND RECORDER</h2>
                    </div>
                    <button onClick={onClose} className="hover:scale-110 transition-transform">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* MAIN CONTENT */}
                <div className="p-6 flex flex-col items-center justify-center flex-grow gap-6">

                    {/* VISUALIZER */}
                    <div className="w-full h-24 bg-[#064e3b] rounded-xl border-4 border-black flex items-center justify-center overflow-hidden p-4 gap-1 shadow-inner relative">
                        {/* Dashed line center */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 border-t-2 border-dashed border-[#22c55e]/30 -translate-y-1/2 pointer-events-none"></div>

                        {visuals.map((h, i) => (
                            <div
                                key={i}
                                className="w-full bg-[#22c55e] rounded-full transition-all duration-75 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                style={{ height: `${Math.max(10, h)}%` }}
                            />
                        ))}
                    </div>

                    {/* RECORD BUTTON (Initial State) */}
                    {mode === 'RECORD' && !audioBlob && (
                        <div className="relative">
                            <button
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                className={`w-20 h-20 rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#ffc107] hover:bg-[#ffcd38]'}`}
                            >
                                <Mic size={32} className="text-black" strokeWidth={2.5} />
                            </button>
                            {isRecording && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded border-2 border-black animate-bounce whitespace-nowrap">RECORDING!</div>}
                        </div>
                    )}

                    {/* EDITOR INTERFACE (Visible after recording) */}
                    {audioBlob && (
                        <div className="w-full flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">

                            {/* PLAYBACK CONTROLS */}
                            <div className="flex gap-4 justify-center items-center">
                                <button
                                    onClick={isPlayingPreview ? stopPreview : playPreview}
                                    disabled={!originalAudioBuffer}
                                    className={`w-16 h-16 rounded-full border-4 border-black flex items-center justify-center transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${!originalAudioBuffer ? 'bg-gray-300 cursor-not-allowed' : isPlayingPreview ? 'bg-[#22c55e]' : 'bg-[#ffc107] hover:bg-[#ffcd38]'}`}
                                >
                                    {isPlayingPreview ? <Square fill="black" size={20} /> : <Play fill="black" size={24} className={!originalAudioBuffer ? 'opacity-50' : ''} />}
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
                                    className="w-12 h-12 rounded-full bg-gray-100 border-4 border-black flex items-center justify-center hover:bg-red-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none text-gray-500 hover:text-red-500"
                                >
                                    <Trash2 size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* EFFECTS CONTROLS */}
                            <div className="bg-white p-4 rounded-xl border-4 border-black/10 flex flex-col gap-4">
                                <div className="flex justify-between items-center border-b-2 border-dashed border-gray-200 pb-2">
                                    <h3 className="font-black text-xs text-gray-400 flex items-center gap-1 tracking-wider"><Sliders size={12} /> EFFECTS</h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => applyPreset('CHIPMUNK')} className="px-2 py-1 bg-blue-100 border-2 border-black rounded text-[10px] font-bold hover:bg-blue-200 transition-transform hover:-translate-y-0.5">CHIPMUNK</button>
                                        <button onClick={() => applyPreset('MONSTER')} className="px-2 py-1 bg-purple-100 border-2 border-black rounded text-[10px] font-bold hover:bg-purple-200 transition-transform hover:-translate-y-0.5">MONSTER</button>
                                        <button onClick={() => applyPreset('RADIO')} className="px-2 py-1 bg-gray-200 border-2 border-black rounded text-[10px] font-bold hover:bg-gray-300 transition-transform hover:-translate-y-0.5">RADIO</button>
                                    </div>
                                </div>

                                {/* SPEED / PITCH */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wide">
                                        <span>Speed / Pitch</span>
                                        <span>{Math.round(pitch * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="2.0" step="0.1"
                                        value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))}
                                        className="w-full accent-[#22c55e] h-3 bg-gray-200 rounded-full appearance-none cursor-pointer border-2 border-black"
                                    />
                                </div>

                                {/* CRUNCH */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wide">
                                        <span>Crunch</span>
                                        <span>{crunch > 0 ? Math.round(crunch) : 'OFF'}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="400" step="10"
                                        value={crunch} onChange={(e) => setCrunch(parseFloat(e.target.value))}
                                        className="w-full accent-[#ef4444] h-3 bg-gray-200 rounded-full appearance-none cursor-pointer border-2 border-black"
                                    />
                                </div>

                                {/* VOLUME */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wide">
                                        <span>Volume</span>
                                        <span>{Math.round(volume * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2.0" step="0.1"
                                        value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-full accent-[#3b82f6] h-3 bg-gray-200 rounded-full appearance-none cursor-pointer border-2 border-black"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER SAVE */}
                <div className="p-4 bg-white border-t-4 border-black flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!audioBlob}
                        className={`w-full py-3 font-black text-lg flex items-center justify-center gap-2 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none ${!audioBlob ? 'opacity-50 cursor-not-allowed bg-gray-200' : 'bg-[#22c55e] hover:bg-[#16a34a]'}`}
                    >
                        <Save size={20} strokeWidth={3} /> SAVE SOUND
                    </button>
                </div>

            </div>
        </div>
    );
};