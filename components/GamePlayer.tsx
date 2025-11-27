import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Rule, RuleTrigger, RuleEffect, LevelObject, Actor, InteractionType, ActiveAnimation, GameData, MusicRow } from '../types';

import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE, MOVE_STEP, DEFAULT_ACTOR_ID, DEFAULT_HERO, CANVAS_SIZE } from '../constants';
import { Trophy, Skull, MousePointer, DoorOpen, Loader2, Play, Volume2, Hash } from 'lucide-react';

interface GamePlayerProps {
    gameData: GameData;
    currentSceneId: string;
    onExit: () => void;
    onNextScene: () => void;
}

// --- HELPER: Base64 to ArrayBuffer ---
const base64ToArrayBuffer = (base64: string) => {
    try {
        const content = base64.includes(',') ? base64.split(',')[1] : base64;
        const binaryString = window.atob(content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("Base64 decode error", e);
        return new ArrayBuffer(0);
    }
};

// --- SPEECH BUBBLE COMPONENT ---
const SpeechBubble = ({ text }: { text: string }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        let i = 0;
        setDisplayedText("");
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 50); // Speed of typing
        return () => clearInterval(interval);
    }, [text]);

    return (
        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 bg-white border-[3px] border-black rounded-xl px-3 py-2 shadow-md z-50 min-w-[100px] max-w-[200px] text-center pointer-events-none animate-in zoom-in duration-200 origin-bottom">
            <p className="text-sm font-bold leading-tight">{displayedText}</p>
            {/* Triangle tail */}
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
        </div>
    );
};

// --- ANIMATED SPRITE COMPONENT ---
const AnimatedSprite = ({
    baseActor,
    playingActor,
    isLooping,
    isEphemeral,
    onFinish,
    triggerTime
}: {
    baseActor: Actor,
    playingActor?: Actor,
    isLooping?: boolean,
    isEphemeral?: boolean,
    onFinish: () => void,
    triggerTime?: number
}) => {
    const [frameIdx, setFrameIdx] = useState(0);
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const activeFrames = playingActor?.frames && playingActor.frames.length > 0 ? playingActor.frames : [baseActor.imageData];
    const isPlaying = !!playingActor;

    useEffect(() => {
        setFrameIdx(0);
        lastTimeRef.current = 0;
    }, [playingActor?.id, triggerTime]);

    useEffect(() => {
        if (!isPlaying || activeFrames.length <= 1) return;

        const animate = (time: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const deltaTime = time - lastTimeRef.current;

            if (deltaTime > 100) {
                setFrameIdx(curr => {
                    const next = curr + 1;
                    if (next >= activeFrames.length) {
                        if (isLooping) return 0;
                        return curr;
                    }
                    return next;
                });
                lastTimeRef.current = time;
            }
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [activeFrames.length, isPlaying, isLooping]);

    const [imgError, setImgError] = useState(false);

    const displayImage = isPlaying ? activeFrames[frameIdx] : (baseActor.frames && baseActor.frames.length > 0 ? baseActor.frames[0] : baseActor.imageData);

    if (!displayImage) {
        console.warn('AnimatedSprite: No image data for actor', baseActor.id, baseActor.name);
        return <div className="w-full h-full bg-pink-500/50 flex items-center justify-center text-[10px] font-bold text-white border-2 border-pink-500">NO DATA</div>;
    }

    if (imgError) {
        return (
            <div className="w-full h-full bg-red-500/50 flex flex-col items-center justify-center text-[8px] font-bold text-white border-2 border-red-500 overflow-hidden">
                <span>ERR</span>
                <span className="truncate w-full text-center">{baseActor.name}</span>
            </div>
        );
    }

    return (
        <img
            src={displayImage}
            alt={baseActor.name}
            className={`w-full h-full object-fill drop-shadow-sm pointer-events-none ${isEphemeral ? '' : ''}`}
            style={{ imageRendering: 'pixelated' }} // Ensure sharp scaling
            onError={() => {
                console.error('AnimatedSprite: Failed to load image for', baseActor.name);
                setImgError(true);
            }}
        />
    );
};

// --- BACKGROUND ANIMATION COMPONENT ---
const BackgroundLayer = ({ image, frames }: { image?: string, frames?: string[] }) => {
    const [frameIdx, setFrameIdx] = useState(0);

    useEffect(() => {
        if (frames && frames.length > 1) {
            const interval = setInterval(() => {
                setFrameIdx(curr => (curr + 1) % frames.length);
            }, 200); // 5 FPS for BG
            return () => clearInterval(interval);
        } else {
            setFrameIdx(0);
        }
    }, [frames]);

    const current = (frames && frames.length > 0) ? frames[frameIdx] : image;

    if (!current) return null;

    return (
        <div className="absolute inset-0 z-0">
            <img
                src={current}
                className="w-full h-full object-cover"
                alt="Background"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    );
};

export const GamePlayer: React.FC<GamePlayerProps> = ({ gameData, currentSceneId, onExit, onNextScene }) => {
    const [activeSceneId, setActiveSceneId] = useState(currentSceneId);
    const [objects, setObjects] = useState<LevelObject[]>([]);

    // VARIABLES STATE
    const [runtimeVariables, setRuntimeVariables] = useState<Record<string, number>>({});

    // DIALOGUE STATE (Active Speech Bubbles)
    const [activeBubbles, setActiveBubbles] = useState<Record<string, { text: string, expiresAt: number }>>({});

    // SHAKE STATE
    const [shakeIntensity, setShakeIntensity] = useState(0);

    // --- MUSIC PLAYBACK ---
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const currentMusicIdRef = useRef<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // --- AUDIO HELPERS ---
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

    const playRowSound = (rowIndex: number, time: number, durationInSteps: number = 1, noteOverride?: string | string[], targetRows?: MusicRow[], targetTempo?: number) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const rows = targetRows;
        if (!rows) return;
        const row = rows[rowIndex];

        if (row.isMuted) return;

        const volume = row.volume ?? 1.0;

        // Calculate duration in seconds
        const currentTempo = targetTempo || 120;
        const secondsPerBeat = 60.0 / currentTempo;
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

    useEffect(() => {
        const scene = gameData.scenes.find(s => s.id === currentSceneId);
        const musicId = scene?.backgroundMusicId;

        // Only update if the music ID has actually changed
        if (musicId !== currentMusicIdRef.current) {
            // Stop old music
            if (musicRef.current) {
                musicRef.current.pause();
                musicRef.current = null;
            }
            if (audioCtxRef.current) { // Stop generated music
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }

            currentMusicIdRef.current = musicId || null;

            if (musicId) {
                const track = gameData.music?.find(t => t.id === musicId);
                if (track && track.type === 'UPLOAD') {
                    const audio = new Audio(track.data);
                    audio.loop = true;
                    audio.volume = 0.5; // Default volume
                    audio.play().catch(e => console.error("Music play failed", e));
                    musicRef.current = audio;
                } else if (track && track.type === 'GENERATED' && track.sequence) {
                    // GENERATED MUSIC PLAYBACK
                    console.log("Starting generated music playback for:", track.name, "Sequence Length:", track.sequence?.length);
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContextClass();
                    audioCtxRef.current = ctx;

                    // DEBUG STATE
                    const updateDebugInfo = () => {
                        if (document.getElementById('debug-audio-state')) {
                            document.getElementById('debug-audio-state')!.innerText = ctx.state;
                        }
                    };
                    setInterval(updateDebugInfo, 500);

                    // Resume context strategy
                    const resumeContext = () => {
                        if (ctx.state === 'suspended') {
                            ctx.resume().then(() => {
                                console.log("AudioContext resumed successfully");
                                updateDebugInfo();
                            }).catch(e => console.error("Failed to resume AudioContext:", e));
                        }
                    };

                    resumeContext();

                    // Fallback: Try to resume on any user interaction if still suspended
                    const resumeOnInteraction = () => {
                        if (ctx.state === 'suspended') {
                            resumeContext();
                        }
                    };

                    document.addEventListener('click', resumeOnInteraction);
                    document.addEventListener('keydown', resumeOnInteraction);
                    document.addEventListener('touchstart', resumeOnInteraction);

                    const tempo = track.tempo || 120;
                    const secondsPerBeat = 60.0 / tempo;
                    const stepDuration = 0.25 * secondsPerBeat; // 16th notes
                    const lookahead = 25.0; // ms
                    const scheduleAheadTime = 0.1; // s

                    let nextNoteTime = ctx.currentTime;
                    let currentStep = 0;
                    const steps = track.steps || 16;
                    let isPlaying = true;

                    // Scheduler function
                    const scheduler = () => {
                        if (!isPlaying) return;

                        while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
                            // Schedule notes for current step
                            if (track && track.sequence) {
                                const notesInStep = track.sequence.filter(n => n.time === currentStep);
                                notesInStep.forEach(note => {
                                    if (track.rows) {
                                        const rowIndex = note.note; // `note.note` is the index of the row
                                        const row = track.rows[rowIndex];
                                        if (row) {
                                            const melodyNotes = row.notes?.[currentStep];
                                            const duration = note.duration || 1;
                                            if (duration > 0) {
                                                playRowSound(rowIndex, nextNoteTime, duration, melodyNotes, track.rows, track.tempo);
                                            }
                                        }
                                    } else {
                                        // LEGACY PLAYBACK (Fallback if no rows)
                                        const osc = ctx.createOscillator();
                                        const gain = ctx.createGain();
                                        osc.connect(gain);
                                        gain.connect(ctx.destination);

                                        // Frequency calculation
                                        const baseFreq = 261.63; // C4
                                        const freq = baseFreq * Math.pow(2, note.note / 12);
                                        osc.frequency.value = freq;
                                        osc.type = 'square';

                                        gain.gain.setValueAtTime(0.2, nextNoteTime);
                                        gain.gain.linearRampToValueAtTime(0.001, nextNoteTime + 0.2);

                                        osc.start(nextNoteTime);
                                        osc.stop(nextNoteTime + 0.2);
                                    }
                                });
                            }

                            // Advance step
                            nextNoteTime += stepDuration;
                            currentStep = (currentStep + 1) % steps;
                        }

                        // Keep scheduling
                        if (isPlaying) {
                            setTimeout(scheduler, lookahead);
                        }
                    };

                    scheduler();

                    // Store context in ref to close it later
                    const controls = {
                        pause: () => {
                            isPlaying = false;
                            document.removeEventListener('click', resumeOnInteraction);
                            document.removeEventListener('keydown', resumeOnInteraction);
                            document.removeEventListener('touchstart', resumeOnInteraction);
                            ctx.close();
                        },
                        play: () => { }
                    };
                    (musicRef as any).current = controls;
                }
            }
        }
    }, [currentSceneId, gameData.scenes, gameData.music]);

    // Cleanup on unmount
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (musicRef.current) {
                musicRef.current.pause();
                musicRef.current = null;
            }
        };
    }, []);

    // --- PHYSICS STATE ---
    const [particles, setParticles] = useState<{ id: string, x: number, y: number, color: string, vx: number, vy: number, life: number, size: number, type: 'CONFETTI' | 'EXPLOSION' | 'SMOKE' | 'RAIN' | 'SPARKLES', actorId?: string }[]>([]);

    const [status, setStatus] = useState<'LOADING' | 'READY' | 'PLAYING' | 'WON' | 'LOST' | 'TRANSITION'>('LOADING');
    const [loadedSoundCount, setLoadedSoundCount] = useState(0);

    // HUD STATE
    const [activeVariablePopup, setActiveVariablePopup] = useState<string | null>(null);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const executingRuleIds = useRef<Set<string>>(new Set());
    const lastTimerExecution = useRef<Record<string, number>>({});
    const activeCollisions = useRef<Set<string>>(new Set());
    const requestRef = useRef<number>(0); // For Physics Loop

    const objectsRef = useRef<LevelObject[]>([]);
    useEffect(() => { objectsRef.current = objects; }, [objects]);

    const variablesRef = useRef<Record<string, number>>({});
    useEffect(() => { variablesRef.current = runtimeVariables; }, [runtimeVariables]);

    // --- AUDIO ENGINE ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBuffers = useRef<Map<string, AudioBuffer>>(new Map());

    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const loadSounds = async () => {
            const sounds = gameData.sounds || [];
            let count = 0;
            for (const sound of sounds) {
                if (!sound.data) continue;
                try {
                    const arrayBuffer = base64ToArrayBuffer(sound.data);
                    if (arrayBuffer.byteLength > 0) {
                        const decoded = await ctx.decodeAudioData(arrayBuffer);
                        audioBuffers.current.set(sound.id, decoded);
                        count++;
                    }
                } catch (e) { console.warn("Failed to preload sound:", sound.id, e); }
            }
            setLoadedSoundCount(count);
            setStatus('READY');
        };
        loadSounds();
        return () => { ctx.close(); };
    }, [gameData.sounds]);

    const startGame = async () => {
        if (audioContextRef.current) {
            try { await audioContextRef.current.resume(); } catch (e) { }
        }
        setStatus('PLAYING');
    };

    const playSound = (soundId: string) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const buffer = audioBuffers.current.get(soundId);
        if (buffer) {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        }
    };

    // Init or Reset
    useEffect(() => { resetGame(currentSceneId); }, [currentSceneId]);

    const resetGame = (sceneId: string) => {
        setActiveSceneId(sceneId);
        const scene = gameData.scenes.find(s => s.id === sceneId) || gameData.scenes[0];
        setObjects(scene.objects.map(o => ({ ...o, activeAnimation: undefined })));

        // Reset Variables (Preserve Globals)
        setRuntimeVariables(prev => {
            const nextVars = { ...prev };
            if (gameData.variables) {
                gameData.variables.forEach(v => {
                    // If it's a GLOBAL variable, only set it if it doesn't exist yet (first load)
                    // If it's a SCENE variable (scoped to this scene), reset it
                    // If it's a SCENE variable (scoped to ANOTHER scene), leave it alone (or reset? doesn't matter much if not visible)

                    const isGlobal = v.scope === 'GLOBAL' || !v.scope;
                    const isCurrentScene = v.scope === sceneId;

                    if (isGlobal) {
                        if (nextVars[v.id] === undefined) {
                            nextVars[v.id] = v.initialValue;
                        }
                        // If it exists, KEEP IT!
                    } else if (isCurrentScene) {
                        // Always reset local variables for the new scene
                        nextVars[v.id] = v.initialValue;
                    }
                });
            }
            return nextVars;
        });
        setActiveBubbles({}); // Clear bubbles

        setStatus(prev => (prev === 'LOADING' || prev === 'READY') ? prev : 'PLAYING');
        setDraggingId(null);
        executingRuleIds.current.clear();
        activeCollisions.current.clear();
        setShakeIntensity(0);
    };

    // PHYSICS LOOP (Projectiles & Particles)
    useEffect(() => {
        let lastTime = performance.now();
        const loop = (time: number) => {
            const dt = (time - lastTime) / 1000; // Delta time in seconds
            lastTime = time;

            // Update Objects (Projectiles & HELD objects)
            setObjects(prev => {
                let changed = false;
                const next = prev.map(o => {
                    // HELD OBJECT LOGIC
                    if (o.heldBy) {
                        const holder = prev.find(h => h.id === o.heldBy);
                        if (holder) {
                            // Snap to holder WITH OFFSET
                            const mySize = ACTOR_SIZE * (o.scale || 1);
                            const holderSize = ACTOR_SIZE * (holder.scale || 1);

                            // Use configured offsets if available, otherwise center
                            const offsetX = o.holdOffsetX ?? 0;
                            const offsetY = o.holdOffsetY ?? 0;

                            // Position relative to holder's center + offset
                            const nx = holder.x + (holderSize / 2) - (mySize / 2) + offsetX;
                            const ny = holder.y + (holderSize / 2) - (mySize / 2) + offsetY;

                            if (Math.abs(o.x - nx) > 1 || Math.abs(o.y - ny) > 1) {
                                changed = true;
                                return { ...o, x: nx, y: ny, vx: 0, vy: 0 };
                            }
                            return o;
                        } else {
                            // Holder gone, drop it
                            changed = true;
                            return { ...o, heldBy: undefined };
                        }
                    }

                    // Handle Active Path Movement
                    if (o.activePath) {
                        changed = true;
                        const targetPoint = o.activePath.points[o.activePath.currentIndex];
                        const dx = targetPoint.x - o.x;
                        const dy = targetPoint.y - o.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const speed = o.activePath.speed || 2;

                        if (dist < speed) {
                            // Reached point
                            const nextIndex = (o.activePath.currentIndex + 1) % o.activePath.points.length;
                            // If not looping and reached end, stop
                            if (!o.activePath.loop && nextIndex === 0) {
                                return { ...o, x: targetPoint.x, y: targetPoint.y, activePath: undefined };
                            }
                            return {
                                ...o,
                                x: targetPoint.x,
                                y: targetPoint.y,
                                activePath: { ...o.activePath, currentIndex: nextIndex }
                            };
                        } else {
                            // Move towards point
                            return {
                                ...o,
                                x: o.x + (dx / dist) * speed,
                                y: o.y + (dy / dist) * speed
                            };
                        }
                    }

                    if (o.vx || o.vy || o.z || o.vz || o.hasGravity) {
                        changed = true;
                        let nx = o.x + (o.vx || 0) * dt * 60; // Scale speed
                        let ny = o.y + (o.vy || 0) * dt * 60;

                        // Z-Axis Physics (Jump)
                        let nz = (o.z || 0) + (o.vz || 0) * dt * 60;
                        let nvz = (o.vz || 0);

                        // Gravity (Z-Axis - Jumps)
                        if (nz > 0 || nvz > 0) {
                            nvz -= 1.5 * dt * 60; // Gravity force
                        }

                        // AUTO DESTROY CHECK
                        if (o.autoDestroy) {
                            const scaleX = o.scaleX !== undefined ? o.scaleX : (o.scale || 1.0);
                            const scaleY = o.scaleY !== undefined ? o.scaleY : (o.scale || 1.0);
                            const width = ACTOR_SIZE * scaleX;
                            const height = ACTOR_SIZE * scaleY;

                            const isOffScreen =
                                (nx + width < -100) || // Left
                                (nx > SCENE_WIDTH + 100) || // Right
                                (ny + height < -100) || // Top
                                (ny > SCENE_HEIGHT + 100); // Bottom

                            if (isOffScreen) {
                                console.log('AUTO DESTROY:', o.id, { nx, ny, width, height, SCENE_WIDTH, SCENE_HEIGHT });
                                return null; // Remove object
                            }
                        }

                        // 2D Gravity (Y-Axis - Flappy Bird)
                        if (o.hasGravity) {
                            if (o.vy === undefined) o.vy = 0;
                            const gravity = 0.4; // Reduced from 0.5 + 0.8
                            o.vy += gravity;
                        }

                        // SCREEN BOUNDS CHECK (Clamping)
                        // Force screen collision for gravity objects (Hero)
                        if (o.hasScreenCollision || o.hasGravity) {
                            const scaleY = o.scaleY !== undefined ? o.scaleY : (o.scale || 1.0);
                            const height = ACTOR_SIZE * scaleY;

                            // Clamp Y
                            if (ny < 0) {
                                ny = 0;
                                if ((o.vy || 0) < 0) o.vy = 0; // Stop moving up
                            } else if (ny + height > SCENE_HEIGHT) {
                                ny = SCENE_HEIGHT - height;
                                if ((o.vy || 0) > 0) o.vy = 0; // Stop moving down
                            }
                        }

                        // OFF SCREEN CHECK
                        const margin = 50;
                        const currentScaleX = o.scaleX !== undefined ? o.scaleX : (o.scale || 1.0);
                        const currentScaleY = o.scaleY !== undefined ? o.scaleY : (o.scale || 1.0);
                        const dW = ACTOR_SIZE * currentScaleX;
                        const dH = ACTOR_SIZE * currentScaleY;

                        // Check if the object is COMPLETELY off screen
                        const isOffScreen = (nx + dW) < -margin || nx > SCENE_WIDTH + margin || (ny + dH) < -margin || ny > SCENE_HEIGHT + margin;

                        if (isOffScreen) {
                            // Trigger logic handled below in the loop over 'next'
                        }

                        // Bounds check for projectiles (destroy if out of bounds)
                        if (o.isEphemeral && isOffScreen) {
                            return null; // Mark for deletion
                        }

                        // NEW: Apply Gravity to VY for next frame
                        let finalVy = o.vy || 0;
                        // REMOVED EXTRA GRAVITY APPLICATION HERE

                        return { ...o, x: nx, y: ny, z: nz, vz: nvz, vy: finalVy };
                    }
                    return o;
                }).filter(Boolean) as LevelObject[];

                // PROCESS OFF-SCREEN TRIGGERS
                // We need to identify objects that are off-screen in 'next' but weren't (or we just check 'next').
                // To avoid spamming, we can check if they are newly off-screen?
                // Or just trigger every frame it is off screen? 
                // "WHEN OFF SCREEN" implies a continuous state or an event?
                // Usually "On Exit Screen".
                // Let's trigger it every frame, but the user should use "Destroy Object" or "Once".
                // Actually, for Flappy Bird, we want "When Pipe goes off screen -> Destroy it".
                // If we trigger every frame, and the effect is "Score + 1", it will be infinite score.
                // So we MUST trigger only once.
                // We can add a runtime flag 'hasTriggeredOffScreen'.

                next.forEach(obj => {
                    const margin = 50;
                    const currentScaleX = obj.scaleX !== undefined ? obj.scaleX : (obj.scale || 1.0);
                    const currentScaleY = obj.scaleY !== undefined ? obj.scaleY : (obj.scale || 1.0);
                    const dW = ACTOR_SIZE * currentScaleX;
                    const dH = ACTOR_SIZE * currentScaleY;

                    // Check if the object is COMPLETELY off screen
                    const isOffScreen = (obj.x + dW) < -margin || obj.x > SCENE_WIDTH + margin || (obj.y + dH) < -margin || obj.y > SCENE_HEIGHT + margin;

                    if (isOffScreen && !(obj as any).hasTriggeredOffScreen) {
                        // Trigger!
                        (obj as any).hasTriggeredOffScreen = true;

                        // We need to execute rules.
                        // We can't do it directly here safely.
                        // Let's use a timeout or a ref queue.
                        // setTimeout is safest to break out of the render/updater cycle.
                        setTimeout(() => {
                            const activeRules = gameData.rules.filter(r => r.scope === 'GLOBAL' || r.scope === activeSceneId);
                            const offScreenRules = activeRules.filter(r => r.trigger === RuleTrigger.OFF_SCREEN);

                            offScreenRules.forEach(rule => {
                                // Check if this object matches the rule subject?
                                // Or is it a generic "Any object off screen"?
                                // Usually rules are "When [Player] [Hits] [Enemy]".
                                // For Off Screen: "When [Pipe] [Off Screen]".
                                if (rule.subjectId === obj.actorId) {
                                    executeRuleEffects(rule.id, rule.effects, obj.id, null);
                                }
                            });
                        }, 0);
                    }
                });

                return changed ? next : prev;
            });


            // Update Particles
            setParticles(prev => {
                if (prev.length === 0) return prev;
                return prev.map(p => {
                    let newVx = p.vx;
                    let newVy = p.vy;
                    let newLife = p.life - dt;

                    // Physics based on Type
                    if (p.type === 'CONFETTI') {
                        newVy += 0.5; // Gravity
                        newVx *= 0.98; // Air resistance
                    } else if (p.type === 'EXPLOSION') {
                        newVy += 0.2;
                        newVx *= 0.95;
                    } else if (p.type === 'SMOKE') {
                        newVy -= 0.5; // Rise up
                        newVx += (Math.random() - 0.5) * 0.5; // Wiggle
                    } else if (p.type === 'RAIN') {
                        newVy = 15; // Fall fast
                    }

                    return {
                        ...p,
                        x: p.x + newVx * dt * 60,
                        y: p.y + newVy * dt * 60,
                        vx: newVx,
                        vy: newVy,
                        life: newLife
                    };
                }).filter(p => p.life > 0);
            });

            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    // Bubble Cleanup Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setActiveBubbles(prev => {
                let changed = false;
                const next = { ...prev };
                for (const key in next) {
                    if (next[key].expiresAt < now) {
                        delete next[key];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Remove ephemeral objects
    useEffect(() => {
        const ephemeralObjs = objects.filter(o => o.isEphemeral);
        if (ephemeralObjs.length > 0) {
            const timer = setTimeout(() => {
                setObjects(prev => prev.filter(o => !o.isEphemeral));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [objects.length]);

    const jumpToScene = (targetId?: string) => {
        let nextId = targetId;
        if (!nextId) {
            const idx = gameData.scenes.findIndex(s => s.id === activeSceneId);
            if (idx >= 0 && idx < gameData.scenes.length - 1) {
                nextId = gameData.scenes[idx + 1].id;
            } else {
                nextId = gameData.scenes[0].id;
            }
        }
        if (gameData.scenes.find(s => s.id === nextId)) {
            resetGame(nextId!);
        }
    };

    const getActor = useCallback((id: string) => gameData.actors.find(a => a.id === id), [gameData]);

    const handleAnimationFinish = (objId: string) => {
        setObjects(prev => prev.map(o => {
            if (o.id === objId) return { ...o, activeAnimation: undefined };
            return o;
        }));
    };

    const getActiveRules = () => {
        return gameData.rules.filter(r => r.scope === 'GLOBAL' || r.scope === activeSceneId);
    };

    // --- CHECK VARIABLE RULES ---
    const checkVariableRules = async () => {
        const activeRules = getActiveRules();
        const varRules = activeRules.filter(r => r.trigger === RuleTrigger.VAR_CHECK);

        for (const rule of varRules) {
            if (executingRuleIds.current.has(rule.id)) continue;

            const currentVal = variablesRef.current[rule.variableId || ''] ?? 0;
            const targetVal = rule.threshold || 0;
            let match = false;

            if (rule.condition === 'EQUALS' && currentVal === targetVal) match = true;
            if (rule.condition === 'GREATER' && currentVal > targetVal) match = true;
            if (rule.condition === 'LESS' && currentVal < targetVal) match = true;

            if (rule.invert) match = !match;

            // CHANCE CHECK
            if (match && rule.chance && Math.random() > rule.chance) match = false;

            if (match) {
                executingRuleIds.current.add(rule.id);
                if (rule.soundId) playSound(rule.soundId);

                // For global rules (VAR_CHECK), default the subject to the Hero (or first actor)
                // This allows effects like "DIE" to work on the player when a variable changes
                const hero = objectsRef.current.find(o => o.actorId === gameData.actors[0].id);
                const subjectId = hero ? hero.id : 'GLOBAL';

                await executeRuleEffects(rule.id, rule.effects, subjectId, null);
                setTimeout(() => executingRuleIds.current.delete(rule.id), 1000);
            }
        }
    };

    // Trigger variable check whenever variables change
    useEffect(() => {
        if (status === 'PLAYING') {
            checkVariableRules();
        }
    }, [runtimeVariables, status]);


    const executeRuleEffects = async (ruleId: string, effects: RuleEffect[], subjectObjId: string, objectObjId: string | null) => {
        let previousActionDuration = 0;

        for (const effect of effects) {
            if (effect.type === InteractionType.THEN) {
                if (previousActionDuration > 0) {
                    await new Promise(resolve => setTimeout(resolve, previousActionDuration));
                }
                previousActionDuration = 0;
                continue;
            }

            if (effect.type === InteractionType.WAIT) {
                // First wait for any previous action
                if (previousActionDuration > 0) {
                    await new Promise(resolve => setTimeout(resolve, previousActionDuration));
                }

                // Then wait for the configured duration (default 1s)
                const waitTime = (effect.value || 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));

                previousActionDuration = 0;
                continue;
            }

            // VARIABLE MODIFICATION
            if (effect.type === InteractionType.MODIFY_VAR && effect.variableId) {
                setRuntimeVariables(prev => {
                    const current = prev[effect.variableId!] || 0;
                    let next = current;
                    if (effect.operation === 'ADD') next += (effect.value || 1);
                    if (effect.operation === 'SUB') next -= (effect.value || 1);
                    if (effect.operation === 'SET') next = (effect.value || 0);
                    return { ...prev, [effect.variableId!]: next };
                });
                previousActionDuration = 0;
                continue;
            }

            // Standard Object Logic...
            let targets: string[] = [];
            if (effect.spawnActorId && (
                (effect.target === 'OBJECT' && !objectObjId) ||
                (effect.type === InteractionType.SPAWN) ||
                (effect.type === InteractionType.SAY) ||
                (effect.type === InteractionType.SWAP && effect.target === 'OBJECT' && !objectObjId)
            )) {
                if (effect.type !== InteractionType.SPAWN) {
                    targets = objectsRef.current.filter(o => o.actorId === effect.spawnActorId).map(o => o.id);
                }
            } else {
                const targetId = effect.target === 'OBJECT' && objectObjId ? objectObjId : subjectObjId;
                if (targetId) targets.push(targetId);
            }

            if (effect.type === InteractionType.SPAWN) {
                // Relaxed validation: only require actorId
                const hasValidLocation = !!effect.spawnActorId;

                if (hasValidLocation) {

                    // Default to center if Y is not set
                    let finalY = effect.spawnY !== undefined ? effect.spawnY : SCENE_HEIGHT / 2;

                    if (effect.spawnRandomY) {
                        const min = effect.spawnYMin !== undefined ? effect.spawnYMin : 0;
                        const max = effect.spawnYMax !== undefined ? effect.spawnYMax : SCENE_HEIGHT;
                        finalY = min + Math.random() * (max - min);
                    }

                    // Default spawnX to SCENE_WIDTH (right edge) if undefined
                    const finalX = effect.spawnX !== undefined ? effect.spawnX : SCENE_WIDTH;

                    if (effect.spawnMode === 'DOUBLE_VERTICAL') {
                        // INLINED SPAWN PIPE PAIR LOGIC
                        // 1. Determine X Position & Velocity
                        const pipeFinalX = effect.spawnX !== undefined ? effect.spawnX : SCENE_WIDTH + 50;

                        // Velocity: Default to -5 (moving left) if 0 or undefined.
                        const spawnVx = effect.spawnVelocity?.x ?? 0;
                        const finalVx = (spawnVx === 0) ? -5 : spawnVx;

                        // 2. Determine Gap Position (Y)
                        const gap = effect.spawnGap || 150;
                        const safeMargin = 100; // Minimum distance from top/bottom edges
                        const minGapY = safeMargin + gap / 2;
                        const maxGapY = SCENE_HEIGHT - safeMargin - gap / 2;

                        let gapCenterY = SCENE_HEIGHT / 2; // Default center

                        if (effect.spawnRandomY) {
                            gapCenterY = Math.random() * (maxGapY - minGapY) + minGapY;
                        } else if (effect.spawnY !== undefined && effect.spawnY !== null) {
                            gapCenterY = effect.spawnY;
                        }

                        // Clamp gapCenterY
                        gapCenterY = Math.max(minGapY, Math.min(gapCenterY, maxGapY));

                        // 3. Calculate Pipe Positions
                        const topPipeBottomY = gapCenterY - gap / 2;
                        const bottomPipeTopY = gapCenterY + gap / 2;

                        // 4. Scale & Dimensions
                        // Use user-defined scaleY if available, otherwise default to 3.0 (240px)
                        const fixedScaleY = effect.spawnScaleY || 3.0;
                        const pipeHeight = ACTOR_SIZE * fixedScaleY;

                        // Top Pipe Y (Top-Left corner) = Bottom Edge - Height
                        const topY = topPipeBottomY - pipeHeight;

                        // Bottom Pipe Y (Top-Left corner) = Top Edge
                        const bottomY = bottomPipeTopY;

                        const scaleX = effect.spawnScaleX || 1.0;

                        // 5. Determine Actors
                        const finalActorId2 = effect.spawnActorId2 || effect.spawnActorId!;

                        // 6. Create Objects
                        const obj1: LevelObject = {
                            id: Math.random().toString(36).substr(2, 9),
                            actorId: effect.spawnActorId!,
                            x: pipeFinalX,
                            y: topY,
                            scale: effect.spawnScale || 1.0,
                            scaleX: scaleX,
                            scaleY: fixedScaleY,
                            vx: finalVx,
                            vy: 0,
                            isLocked: false,
                            ignoresGravity: true,
                            autoDestroy: true,
                            flipY: true // Top pipe flipped
                        };

                        const obj2: LevelObject = {
                            id: Math.random().toString(36).substr(2, 9),
                            actorId: finalActorId2,
                            x: pipeFinalX,
                            y: bottomY,
                            scale: effect.spawnScale || 1.0,
                            scaleX: scaleX,
                            scaleY: fixedScaleY,
                            vx: finalVx,
                            vy: 0,
                            isLocked: false,
                            ignoresGravity: true,
                            autoDestroy: true
                        };

                        setObjects(prev => [...prev, obj1, obj2]);
                    } else {
                        const newObj: LevelObject = {
                            id: Math.random().toString(36).substr(2, 9),
                            actorId: effect.spawnActorId!,
                            x: finalX,
                            y: finalY,
                            scale: effect.spawnScale || 1.0,
                            scaleX: effect.spawnScaleX,
                            scaleY: effect.spawnScaleY,
                            vx: effect.spawnVelocity?.x || 0,
                            vy: effect.spawnVelocity?.y || 0,
                            isLocked: false,
                            autoDestroy: effect.spawnAutoDestroy
                        };
                        setObjects(prev => [...prev, newObj]);
                    }
                }
                previousActionDuration = 0;
                continue;
            }

            for (const targetId of targets) {
                // SAY EFFECT
                if (effect.type === InteractionType.SAY && effect.text) {
                    const duration = Math.max(2000, effect.text.length * 100); // Minimum 2s, or longer for more text
                    setActiveBubbles(prev => ({
                        ...prev,
                        [targetId]: { text: effect.text!, expiresAt: Date.now() + duration }
                    }));
                    // Don't block sequence too long, but maybe a little?
                    previousActionDuration = 500;
                    continue;
                }

                switch (effect.type) {
                    case InteractionType.PLAY_MUSIC:
                        if (effect.spawnActorId) { // spawnActorId holds the musicId
                            const musicId = effect.spawnActorId;
                            const track = gameData.music?.find(t => t.id === musicId);

                            if (track) {
                                // Stop current music
                                if (musicRef.current) {
                                    musicRef.current.pause();
                                    musicRef.current = null;
                                }
                                currentMusicIdRef.current = musicId;

                                // Play new music (Reusing logic from useEffect)
                                if (track.type === 'UPLOAD') {
                                    const audio = new Audio(track.data);
                                    audio.loop = true;
                                    audio.volume = 0.5;
                                    audio.play().catch(e => console.error("Music play failed", e));
                                    musicRef.current = audio;
                                } else if (track.type === 'GENERATED' && track.sequence) {
                                    // GENERATED MUSIC PLAYBACK LOGIC
                                    console.log("Starting generated music playback (Effect) for:", track.name);
                                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                    const ctx = new AudioContextClass();

                                    // DEBUG STATE
                                    const updateDebugInfo = () => {
                                        if (document.getElementById('debug-audio-state')) {
                                            document.getElementById('debug-audio-state')!.innerText = ctx.state;
                                        }
                                    };
                                    setInterval(updateDebugInfo, 500);

                                    const resumeContext = () => {
                                        if (ctx.state === 'suspended') {
                                            ctx.resume().then(() => {
                                                console.log("AudioContext resumed successfully");
                                                updateDebugInfo();
                                            });
                                        }
                                    };
                                    resumeContext();

                                    const tempo = track.tempo || 120;
                                    const secondsPerBeat = 60.0 / tempo;
                                    const stepDuration = 0.25 * secondsPerBeat;
                                    const lookahead = 25.0;
                                    const scheduleAheadTime = 0.1;

                                    let nextNoteTime = ctx.currentTime;
                                    let currentStep = 0;
                                    const steps = track.steps || 16;
                                    let isPlaying = true;

                                    const scheduler = () => {
                                        if (!isPlaying) return;

                                        while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
                                            const notesInStep = track.sequence!.filter(n => n.time === currentStep);
                                            notesInStep.forEach(note => {
                                                const durationInSteps = note.duration || 1;
                                                playRowSound(note.note, nextNoteTime, durationInSteps, undefined, track.rows, track.tempo);
                                            });

                                            nextNoteTime += stepDuration;
                                            currentStep = (currentStep + 1) % steps;
                                        }

                                        if (isPlaying) {
                                            setTimeout(scheduler, lookahead);
                                        }
                                    };

                                    scheduler();
                                    (musicRef as any).current = {
                                        pause: () => {
                                            isPlaying = false;
                                            ctx.close();
                                        },
                                        play: () => { }
                                    };
                                }
                            }
                        }
                        break;

                    case InteractionType.WIN:
                        setStatus('WON');
                        previousActionDuration = 0;
                        break;
                    case InteractionType.DESTROY_SUBJECT:
                        const subjInstance = objectsRef.current.find(o => o.id === subjectObjId);
                        if (subjInstance && subjInstance.actorId === gameData.actors[0].id) {
                            setStatus('LOST');
                        }
                        setObjects(prev => prev.filter(o => o.id !== subjectObjId));
                        if (subjectObjId === draggingId) setDraggingId(null);
                        previousActionDuration = 0;
                        break;
                    case InteractionType.DESTROY_OBJECT:
                        const objInstance = objectsRef.current.find(o => o.id === targetId);
                        if (objInstance && objInstance.actorId === gameData.actors[0].id) {
                            setStatus('LOST');
                        }
                        setObjects(prev => prev.filter(o => o.id !== targetId));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.CHANGE_SCENE:
                        setStatus('TRANSITION');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        jumpToScene(effect.targetSceneId);
                        previousActionDuration = 0;
                        break;
                    case InteractionType.JUMP:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                // Apply vertical velocity for jump (Z-axis)
                                // Default intensity 15 if not specified
                                const jumpStrength = effect.value || 15;
                                return { ...o, vz: jumpStrength };
                            }
                            return o;
                        }));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.SWAP:
                        if (effect.spawnActorId) {
                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return { ...o, actorId: effect.spawnActorId!, activeAnimation: undefined };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 0;
                        break;
                    case InteractionType.PLAY_ANIM:
                        if (effect.spawnActorId) {
                            const actor = getActor(effect.spawnActorId);
                            if (actor && actor.frames && actor.frames.length > 1) {
                                previousActionDuration = (actor.frames.length * 100) + 100;
                            } else {
                                previousActionDuration = 0;
                            }
                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return {
                                        ...o,
                                        activeAnimation: {
                                            playingActorId: effect.spawnActorId!,
                                            isLoop: !!effect.isLoop,
                                            startTime: Date.now()
                                        }
                                    };
                                }
                                return o;
                            }));
                        } else {
                            previousActionDuration = 0;
                        }
                        break;
                    case InteractionType.PUSH:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                const angle = Math.random() * Math.PI * 2;
                                const dist = 50;
                                let nx = o.x + Math.cos(angle) * dist;
                                let ny = o.y + Math.sin(angle) * dist;
                                nx = Math.max(0, Math.min(nx, SCENE_WIDTH - ACTOR_SIZE));
                                ny = Math.max(0, Math.min(ny, SCENE_HEIGHT - ACTOR_SIZE));
                                return { ...o, x: nx, y: ny };
                            }
                            return o;
                        }));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.STEP:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                const stepSize = ACTOR_SIZE; // Move one full tile/actor size
                                let nx = o.x;
                                let ny = o.y;

                                if (effect.direction === 'UP') ny -= stepSize;
                                if (effect.direction === 'DOWN') ny += stepSize;
                                if (effect.direction === 'LEFT') nx -= stepSize;
                                if (effect.direction === 'RIGHT') nx += stepSize;

                                // Bounds check
                                nx = Math.max(0, Math.min(nx, SCENE_WIDTH - ACTOR_SIZE));
                                ny = Math.max(0, Math.min(ny, SCENE_HEIGHT - ACTOR_SIZE));

                                return { ...o, x: nx, y: ny };
                            }
                            return o;
                        }));
                        previousActionDuration = 200; // Small delay for visual feedback
                        break;
                        previousActionDuration = 200; // Small delay for visual feedback
                        break;
                    case InteractionType.SET_VELOCITY:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                return {
                                    ...o,
                                    vx: effect.velocity?.x !== undefined ? effect.velocity.x : o.vx,
                                    vy: effect.velocity?.y !== undefined ? effect.velocity.y : o.vy,
                                    // Auto-enable gravity if jumping (negative Y velocity) to prevent flying off forever
                                    hasGravity: (effect.velocity?.y !== undefined && effect.velocity.y < 0) ? true : o.hasGravity
                                };
                            }
                            return o;
                        }));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.SET_GRAVITY:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                return { ...o, hasGravity: !o.hasGravity }; // Toggle? Or Set? Let's assume Toggle for now or True.
                                // Actually, better to have a value. But for now, let's just enable it.
                                // Or maybe the effect value 1 = ON, 0 = OFF.
                                // Let's assume it enables it.
                                return { ...o, hasGravity: true };
                            }
                            return o;
                        }));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.SHAKE:
                        setShakeIntensity(20); // Shake hard!
                        setTimeout(() => setShakeIntensity(0), 500);
                        previousActionDuration = 0;
                        break;
                    // CHASE (Was STEP)
                    case InteractionType.CHASE:
                        // ... (existing CHASE logic) ...
                        // Move towards target (hero or specific actor)
                        const subjectObj = objectsRef.current.find(o => o.id === targetId);
                        if (!subjectObj) break;

                        const chaseTargetActorId = effect.spawnActorId; // If set, chase this actor. If null, chase hero.

                        let targetX = 0;
                        let targetY = 0;

                        if (chaseTargetActorId) {
                            const targetObj = objectsRef.current.find(o => o.actorId === chaseTargetActorId);
                            if (targetObj) {
                                targetX = targetObj.x;
                                targetY = targetObj.y;
                            }
                        } else {
                            // Chase Hero
                            const hero = objectsRef.current.find(o => o.actorId === gameData.actors[0].id);
                            if (hero) {
                                targetX = hero.x;
                                targetY = hero.y;
                            }
                        }

                        // Simple step towards target
                        const dx = targetX - subjectObj.x;
                        const dy = targetY - subjectObj.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist > 5) {
                            const stepSize = 10; // Pixel per step
                            const moveX = (dx / dist) * stepSize;
                            const moveY = (dy / dist) * stepSize;

                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return { ...o, x: o.x + moveX, y: o.y + moveY };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 200; // Small delay for steps
                        break;

                    case InteractionType.MOVE:
                        if (effect.path && effect.path.length > 0) {
                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return {
                                        ...o,
                                        activePath: {
                                            points: effect.path!,
                                            currentIndex: 0,
                                            speed: 2, // Default speed
                                            loop: true // Default loop? Or make it configurable? Let's say loop for now.
                                        }
                                    };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 0;
                        break;
                    case InteractionType.SHOOT:
                        if (effect.spawnActorId) {
                            // Determine Shooters
                            let shooters: LevelObject[] = [];
                            if (effect.shooterActorId) {
                                shooters = objectsRef.current.filter(o => o.actorId === effect.shooterActorId);
                            } else {
                                // Default: Use the subject (the one performing the action)
                                const s = objectsRef.current.find(o => o.id === subjectObjId);
                                if (s) shooters.push(s);
                            }

                            shooters.forEach(shooter => {
                                let vx = 0;
                                let vy = 0;
                                const speed = 8; // Projectile speed

                                // Find nearest other object to shoot at
                                const others = objectsRef.current.filter(o => o.id !== shooter.id);
                                let closest = null;
                                let minDist = Infinity;
                                for (const o of others) {
                                    const d = Math.hypot(o.x - shooter.x, o.y - shooter.y);
                                    if (d < minDist) {
                                        minDist = d;
                                        closest = o;
                                    }
                                }

                                if (closest) {
                                    const dx = closest.x - shooter.x;
                                    const dy = closest.y - shooter.y;
                                    const dist = Math.hypot(dx, dy);
                                    if (dist > 0) {
                                        vx = (dx / dist) * speed;
                                        vy = (dy / dist) * speed;
                                    }
                                } else {
                                    // Default direction if no target? Down?
                                    vy = speed;
                                }

                                // Calculate Spawn Position with Offset
                                const spawnX = shooter.x + (effect.shootOffsetX || 0);
                                const spawnY = shooter.y + (effect.shootOffsetY || 0);

                                const projectile: LevelObject = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    actorId: effect.spawnActorId!,
                                    x: spawnX,
                                    y: spawnY,
                                    scale: effect.projectileSize || 0.5,
                                    vx,
                                    vy,
                                    isEphemeral: false
                                };

                                setObjects(prev => [...prev, projectile]);
                            });
                        }
                        previousActionDuration = 0;
                        break;
                    case InteractionType.HOLD:
                        // HOLD
                        const holdTargetType = effect.holdConfig?.targetActorId;
                        const holdHolderType = effect.holdConfig?.holderActorId;

                        // 1. Determine the HOLDER Instance(s)
                        let potentialHolders: LevelObject[] = [];
                        if (holdHolderType) {
                            // If a specific holder type is configured, find all instances of that type
                            potentialHolders = objectsRef.current.filter(o => o.actorId === holdHolderType);
                        } else {
                            // Default: The subject of the rule (e.g. the one who clicked or collided)
                            const subj = objectsRef.current.find(o => o.id === subjectObjId);
                            if (subj) potentialHolders.push(subj);
                        }

                        // 2. For each holder, try to find a target to hold
                        const updates = new Map<string, Partial<LevelObject>>();

                        potentialHolders.forEach(holder => {
                            // If this holder is already holding something, maybe skip? Or allow multiple? 
                            // For now, let's assume one item per holder for simplicity, unless we want to stack.
                            // But the user might want to hold multiple things. Let's allow it.

                            let targetToHold: LevelObject | null = null;

                            if (holdTargetType) {
                                // Find nearest instance of this type that is NOT held
                                const candidates = objectsRef.current.filter(o => o.actorId === holdTargetType && !o.heldBy && o.id !== holder.id);
                                let minDist = Infinity;
                                candidates.forEach(c => {
                                    const d = Math.hypot(c.x - holder.x, c.y - holder.y);
                                    if (d < minDist) {
                                        minDist = d;
                                        targetToHold = c;
                                    }
                                });
                            } else {
                                // Default: The target of the rule (e.g. the object clicked or collided with)
                                // But only if it's NOT the holder itself
                                if (targetId && targetId !== holder.id) {
                                    const t = objectsRef.current.find(o => o.id === targetId);
                                    if (t && !t.heldBy) targetToHold = t;
                                }
                            }

                            if (targetToHold) {
                                updates.set(targetToHold.id, {
                                    heldBy: holder.id,
                                    holdOffsetX: effect.holdConfig?.offsetX || 0,
                                    holdOffsetY: effect.holdConfig?.offsetY || 0
                                });
                            }
                        });

                        if (updates.size > 0) {
                            setObjects(prev => prev.map(o => {
                                if (updates.has(o.id)) {
                                    return { ...o, ...updates.get(o.id) };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 0;
                        break;

                    case InteractionType.DROP:
                        // DROP
                        const dropTargetType = effect.holdConfig?.targetActorId;
                        const dropHolderType = effect.holdConfig?.holderActorId;

                        // 1. Determine the HOLDER Instance(s)
                        let droppers: LevelObject[] = [];
                        if (dropHolderType) {
                            droppers = objectsRef.current.filter(o => o.actorId === dropHolderType);
                        } else {
                            const subj = objectsRef.current.find(o => o.id === subjectObjId);
                            if (subj) droppers.push(subj);
                        }

                        // 2. Drop items held by these droppers
                        setObjects(prev => prev.map(obj => {
                            // Is this object held by one of our droppers?
                            const heldByDropper = droppers.some(d => d.id === obj.heldBy);

                            if (heldByDropper) {
                                // If a specific target type was requested, check it
                                if (dropTargetType && obj.actorId !== dropTargetType) return obj;

                                // Drop at holder's position (NO OFFSET)
                                const holder = droppers.find(d => d.id === obj.heldBy);
                                let newX = obj.x;
                                let newY = obj.y;

                                if (holder) {
                                    newX = holder.x;
                                    newY = holder.y;
                                }

                                return {
                                    ...obj,
                                    heldBy: undefined,
                                    holdOffsetX: undefined,
                                    holdOffsetY: undefined,
                                    x: newX,
                                    y: newY
                                };
                            }
                            return obj;
                        }));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.PARTICLES:
                        const targetObj = objectsRef.current.find(o => o.id === targetId);
                        if (targetObj) {
                            const pType = effect.particleType || 'CONFETTI';
                            const pCount = effect.particleCount || 20;
                            const pSize = effect.particleSize || 4;
                            const pArea = effect.particleArea || 20;

                            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
                            if (pType === 'SMOKE') colors.length = 0; // Reset for smoke

                            const newParticles = Array.from({ length: pCount }).map(() => {
                                const angle = Math.random() * Math.PI * 2;
                                const speed = Math.random() * 5 + 2;
                                const offsetR = Math.random() * pArea;

                                let color = colors[Math.floor(Math.random() * colors.length)];
                                if (pType === 'SMOKE') color = `rgba(200, 200, 200, ${Math.random() * 0.5 + 0.5})`;
                                if (pType === 'RAIN') color = '#4444ff';

                                let vx = Math.cos(angle) * speed;
                                let vy = Math.sin(angle) * speed - 5;
                                let life = 1.0 + Math.random();

                                if (pType === 'SMOKE') {
                                    vx = (Math.random() - 0.5) * 2;
                                    vy = -Math.random() * 2 - 1;
                                    life = 2.0;
                                } else if (pType === 'RAIN') {
                                    vx = 0;
                                    vy = 10;
                                    life = 0.5;
                                }

                                return {
                                    id: Math.random().toString(36),
                                    x: targetObj.x + ACTOR_SIZE / 2 + Math.cos(angle) * offsetR,
                                    y: targetObj.y + ACTOR_SIZE / 2 + Math.sin(angle) * offsetR,
                                    color: color || '#fff',
                                    vx,
                                    vy,
                                    life,
                                    size: pSize,
                                    type: pType,
                                    actorId: effect.particleActorId
                                };
                            });
                            setParticles(prev => [...prev, ...newParticles]);
                        }
                        previousActionDuration = 0;
                        break;
                }
            }
        }
    };

    // START & TIMER RULES
    // START & TIMER RULES
    useEffect(() => {
        if (status !== 'PLAYING') return;
        const activeRules = getActiveRules();

        // START
        const startRules = activeRules.filter(r => r.trigger === RuleTrigger.START);
        if (startRules.length > 0) {
            startRules.forEach(rule => {
                if (!executingRuleIds.current.has(rule.id)) {
                    executingRuleIds.current.add(rule.id);
                    if (rule.soundId) setTimeout(() => playSound(rule.soundId!), 50);
                    executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
                }
            });
        }

        // TIMER
        const timerRules = activeRules.filter(r => r.trigger === RuleTrigger.TIMER);
        const interval = setInterval(() => {
            if (status !== 'PLAYING') return;
            const now = Date.now();

            timerRules.forEach(rule => {
                const lastTime = lastTimerExecution.current[rule.id] || 0;
                const intervalMs = (rule.interval || 2) * 1000;

                if (now - lastTime >= intervalMs) {
                    lastTimerExecution.current[rule.id] = now;

                    // SAFEGUARD: Check for Self-Replication (Grey Goo Scenario)
                    const isSelfReplicatingSpawn = rule.effects.some(e => e.type === InteractionType.SPAWN && (e.spawnActorId === rule.subjectId || e.spawnActorId2 === rule.subjectId));

                    if (isSelfReplicatingSpawn) {
                        // FORCE GLOBAL EXECUTION
                        // If the rule is "Pipe spawns Pipe", we treat it as "Global spawns Pipe"
                        // This prevents exponential growth AND allows spawning when 0 pipes exist.
                        if (rule.soundId) playSound(rule.soundId);
                        // Use 'GLOBAL' as subjectId to indicate it's a system event, not attached to an object
                        executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
                    } else {
                        // Normal behavior
                        const targets = objectsRef.current.filter(o => o.actorId === rule.subjectId);
                        if (targets.length > 0) {
                            targets.forEach(t => {
                                if (rule.soundId) playSound(rule.soundId);
                                executeRuleEffects(rule.id, rule.effects, t.id, null);
                            });
                        } else if (!rule.subjectId) {
                            if (rule.soundId) playSound(rule.soundId);
                            executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
                        }
                    }
                }
            });
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [activeSceneId, status]); // Removed objects.length to prevent re-triggering START on spawn

    // KEYBOARD CONTROLS (KEY TRIGGER)
    useEffect(() => {
        if (status !== 'PLAYING') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return; // Ignore auto-repeat (holding key)
            const key = e.key.toUpperCase();
            let mappedKey = key;

            // Map special keys to match Rule format
            if (key === 'ARROWUP') mappedKey = 'UP';
            if (key === 'ARROWDOWN') mappedKey = 'DOWN';
            if (key === 'ARROWLEFT') mappedKey = 'LEFT';
            if (key === 'ARROWRIGHT') mappedKey = 'RIGHT';
            if (key === ' ') mappedKey = 'SPACE';

            // Also support WASD as arrows if desired, or keep them separate?
            // For now, let's map WASD to arrows for backward compatibility if they were used that way
            // But the new recorder allows recording 'W' specifically.
            // Let's keep the old map for now as a fallback or alternative?
            // Actually, the previous code mapped 'w' to 'UP'.
            // If I want to support "Any key", I should probably respect the recorded key.
            // If the rule says 'UP', then ArrowUp or W should trigger it.
            // If the rule says 'W', then only W should trigger it.

            const activeRules = getActiveRules();
            const keyRules = activeRules.filter(r => r.trigger === RuleTrigger.KEY_PRESS);

            keyRules.forEach(rule => {
                let isMatch = false;

                // Legacy/Arrow Logic
                if (rule.key === 'UP' && (key === 'ARROWUP' || key === 'W')) isMatch = true;
                else if (rule.key === 'DOWN' && (key === 'ARROWDOWN' || key === 'S')) isMatch = true;
                else if (rule.key === 'LEFT' && (key === 'ARROWLEFT' || key === 'A')) isMatch = true;
                else if (rule.key === 'RIGHT' && (key === 'ARROWRIGHT' || key === 'D')) isMatch = true;
                // Direct Match (for new keys like SPACE, ENTER, X, Z...)
                else if (rule.key === mappedKey) isMatch = true;

                // Normal: Match AND Not Invert
                // Invert: Not Match AND Invert
                const shouldRun = (isMatch && !rule.invert) || (!isMatch && rule.invert);

                // CHANCE CHECK
                if (shouldRun && rule.chance && Math.random() > rule.chance) return;

                if (shouldRun) {
                    // Find all subjects for this rule
                    const subjects = objectsRef.current.filter(o => o.actorId === rule.subjectId);
                    subjects.forEach(subj => {
                        if (!executingRuleIds.current.has(rule.id)) {
                            if (rule.soundId) playSound(rule.soundId);
                            executeRuleEffects(rule.id, rule.effects, subj.id, null);
                        }
                    });

                    // If no subject (Global rule?), just execute once
                    if (!rule.subjectId) {
                        executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
                    }
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, activeSceneId]);

    // --- SAT COLLISION HELPER ---
    const satCollision = (
        poly1: { x: number, y: number }[],
        poly2: { x: number, y: number }[]
    ) => {
        const polygons = [poly1, poly2];
        for (const polygon of polygons) {
            for (let i = 0; i < polygon.length; i++) {
                const p1 = polygon[i];
                const p2 = polygon[(i + 1) % polygon.length];
                const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x };
                const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                if (len === 0) continue;
                normal.x /= len; normal.y /= len;

                let min1 = Infinity, max1 = -Infinity;
                for (const p of poly1) {
                    const dot = p.x * normal.x + p.y * normal.y;
                    min1 = Math.min(min1, dot);
                    max1 = Math.max(max1, dot);
                }

                let min2 = Infinity, max2 = -Infinity;
                for (const p of poly2) {
                    const dot = p.x * normal.x + p.y * normal.y;
                    min2 = Math.min(min2, dot);
                    max2 = Math.max(max2, dot);
                }

                if (max1 < min2 || max2 < min1) return false;
            }
        }
        return true;
    };

    const getCollisionPoly = (obj: { x: number, y: number, scale?: number, scaleX?: number, scaleY?: number, actorId?: string, flipY?: boolean }, buffer = 0) => {
        const actor = obj.actorId ? getActor(obj.actorId) : null;
        // Default to uniform scale if scaleX/Y not set
        const sx = (obj.scaleX !== undefined ? obj.scaleX : (obj.scale || 1.0));
        const sy = (obj.scaleY !== undefined ? obj.scaleY : (obj.scale || 1.0));

        let w = ACTOR_SIZE * sx;
        let h = ACTOR_SIZE * sy;
        let ox = 0;
        let oy = 0;

        // CUSTOM COLLISION SHAPE
        if (actor?.collisionShape) {
            // Coordinate conversion factor from Editor (128x128) to Game (80x80)
            const coordScale = ACTOR_SIZE / CANVAS_SIZE;

            if (actor.collisionShape.type === 'RECT') {
                // Use custom dimensions if available
                const customW = (actor.collisionShape.width ?? CANVAS_SIZE) * coordScale;
                const customH = (actor.collisionShape.height ?? CANVAS_SIZE) * coordScale;
                const customOX = (actor.collisionShape.offsetX ?? 0) * coordScale;
                const customOY = (actor.collisionShape.offsetY ?? 0) * coordScale;

                w = customW * sx;
                h = customH * sy;
                ox = customOX * sx;
                oy = customOY * sy;
            } else if (actor.collisionShape.type === 'POLYGON' && actor.collisionShape.points) {
                // TRUE POLYGON COLLISION
                // We return the actual points transformed
                const totalHeight = ACTOR_SIZE * sy;

                return actor.collisionShape.points.map(p => {
                    // Scale point from Editor space to Game space
                    let px = (p.x * coordScale) * sx;
                    let py = (p.y * coordScale) * sy;

                    if (obj.flipY) {
                        py = totalHeight - py;
                    }

                    return {
                        x: obj.x + px,
                        y: obj.y + py
                    };
                });
            }
        }

        // HANDLE FLIP Y (For Rects / Default Box)
        if (obj.flipY) {
            const totalHeight = ACTOR_SIZE * sy;
            oy = totalHeight - (oy + h);
        }

        // Simple AABB for now (rotated sprites would need OBB)
        // Buffer shrinks the box slightly for forgiving collision
        const b = buffer;

        // Apply offset to the base position
        const finalX = obj.x + ox;
        const finalY = obj.y + oy;

        return [
            { x: finalX + b, y: finalY + b },
            { x: finalX + w - b, y: finalY + b },
            { x: finalX + w - b, y: finalY + h - b },
            { x: finalX + b, y: finalY + h - b }
        ];
    };

    const checkCollision = (
        rect1: { x: number, y: number, scale?: number, actorId?: string },
        rect2: { x: number, y: number, scale?: number, actorId?: string },
        buffer = 0
    ) => {
        const poly1 = getCollisionPoly(rect1, buffer);
        const poly2 = getCollisionPoly(rect2, buffer);
        return satCollision(poly1, poly2);
    };

    // --- GLOBAL COLLISION DETECTION (Physics & Projectiles) ---
    useEffect(() => {
        if (status !== 'PLAYING') return;

        const objs = objects;
        const activeRules = getActiveRules();
        const collisionRules = activeRules.filter(r => r.trigger === RuleTrigger.COLLISION);
        const hitRules = activeRules.filter(r => r.trigger === RuleTrigger.HIT);

        if (collisionRules.length === 0 && hitRules.length === 0) return;

        // Check all pairs
        for (let i = 0; i < objs.length; i++) {
            for (let j = i + 1; j < objs.length; j++) {
                const objA = objs[i];
                const objB = objs[j];

                const isTouching = checkCollision(objA, objB);
                const pairKey = [objA.id, objB.id].sort().join(':');

                if (isTouching) {
                    if (!activeCollisions.current.has(pairKey)) {
                        activeCollisions.current.add(pairKey);

                        // 1. COLLISION Rules
                        const relevantCollisionRules = collisionRules.filter(r =>
                            (r.subjectId === objA.actorId && r.objectId === objB.actorId) ||
                            (r.subjectId === objB.actorId && r.objectId === objA.actorId)
                        );

                        relevantCollisionRules.forEach(rule => {
                            if (!rule.invert) {
                                // Determine subject and object for the rule
                                let subjectInstanceId = rule.subjectId === objA.actorId ? objA.id : objB.id;
                                let objectInstanceId = rule.subjectId === objA.actorId ? objB.id : objA.id;

                                // If both are same actor type, we need to be careful. 
                                // But usually subjectId != objectId for meaningful rules.
                                // If subjectId == objectId, it triggers twice? 
                                // Let's assume standard case.

                                if (rule.chance && Math.random() > rule.chance) return;
                                if (!executingRuleIds.current.has(rule.id)) {
                                    if (rule.soundId) playSound(rule.soundId);
                                    executingRuleIds.current.add(rule.id);
                                    executeRuleEffects(rule.id, rule.effects, subjectInstanceId, objectInstanceId)
                                        .then(() => executingRuleIds.current.delete(rule.id));
                                }
                            }
                        });

                        // 2. HIT Rules (Projectile)
                        const isAProjectile = (objA.vx || 0) !== 0 || (objA.vy || 0) !== 0;
                        const isBProjectile = (objB.vx || 0) !== 0 || (objB.vy || 0) !== 0;

                        if (isAProjectile || isBProjectile) {
                            const relevantHitRules = hitRules.filter(r =>
                                (r.subjectId === objA.actorId && r.objectId === objB.actorId) ||
                                (r.subjectId === objB.actorId && r.objectId === objA.actorId)
                            );

                            relevantHitRules.forEach(rule => {
                                // HIT Logic: Subject = Victim, Object = Projectile
                                let subjectInstanceId, objectInstanceId;

                                // Case 1: A is Subject (Victim), B is Object (Projectile)
                                if (rule.subjectId === objA.actorId && rule.objectId === objB.actorId) {
                                    if (isBProjectile) {
                                        subjectInstanceId = objA.id;
                                        objectInstanceId = objB.id;
                                    }
                                }
                                // Case 2: B is Subject (Victim), A is Object (Projectile)
                                else if (rule.subjectId === objB.actorId && rule.objectId === objA.actorId) {
                                    if (isAProjectile) {
                                        subjectInstanceId = objB.id;
                                        objectInstanceId = objA.id;
                                    }
                                }

                                if (subjectInstanceId && objectInstanceId) {
                                    if (rule.chance && Math.random() > rule.chance) return;
                                    if (!executingRuleIds.current.has(rule.id)) {
                                        if (rule.soundId) playSound(rule.soundId);
                                        executingRuleIds.current.add(rule.id);
                                        executeRuleEffects(rule.id, rule.effects, subjectInstanceId, objectInstanceId)
                                            .then(() => executingRuleIds.current.delete(rule.id));
                                    }
                                }
                            });
                        }
                    }
                } else {
                    if (activeCollisions.current.has(pairKey)) {
                        activeCollisions.current.delete(pairKey);
                    }
                }
            }
        }
    }, [objects, status, gameData]);

    const handleMouseDown = async (e: React.MouseEvent, obj: LevelObject) => {
        if (status !== 'PLAYING') return;
        e.stopPropagation();
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();

        const activeRules = getActiveRules();
        const clickRules = activeRules.filter(r => r.trigger === RuleTrigger.CLICK);

        let ruleTriggered = false;

        // 1. Trigger Normal Click Rules for THIS object
        // 2. Trigger Inverted Click Rules for ALL OTHER objects

        for (const rule of clickRules) {
            if (executingRuleIds.current.has(rule.id)) continue;

            let shouldRun = false;
            let targetObjId = obj.id;

            if (rule.subjectId === obj.actorId && !rule.invert) {
                // Normal Click on this object
                shouldRun = true;
                ruleTriggered = true;
            } else if (rule.subjectId !== obj.actorId && rule.invert) {
                // Inverted Click: We clicked 'obj', but the rule is for 'rule.subjectId'
                // So we should trigger this rule for all instances of 'rule.subjectId'
                // Wait, we need to iterate over all instances of rule.subjectId
                const subjects = objectsRef.current.filter(o => o.actorId === rule.subjectId);
                subjects.forEach(subj => {
                    if (rule.soundId) playSound(rule.soundId);
                    executeRuleEffects(rule.id, rule.effects, subj.id, null);
                });
                continue; // Handled separately
            }

            if (shouldRun) {
                // CHANCE CHECK
                if (rule.chance && Math.random() > rule.chance) shouldRun = false;
            }

            if (shouldRun) {
                executingRuleIds.current.add(rule.id);
                if (rule.soundId) playSound(rule.soundId);
                await executeRuleEffects(rule.id, rule.effects, targetObjId, null);
                executingRuleIds.current.delete(rule.id);
            }
        }

        if (ruleTriggered) return;

        if (!obj.isLocked) {
            dragOffset.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
            setDraggingId(obj.id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingId || status !== 'PLAYING') return;
        const container = e.currentTarget.getBoundingClientRect();
        const scaleX = SCENE_WIDTH / container.width;
        const scaleY = SCENE_HEIGHT / container.height;
        let newX = (e.clientX - container.left) * scaleX - dragOffset.current.x;
        let newY = (e.clientY - container.top) * scaleY - dragOffset.current.y;
        const movingObj = objects.find(o => o.id === draggingId);
        if (!movingObj) return;
        const mySize = ACTOR_SIZE * (movingObj.scale || 1);
        newX = Math.max(0, Math.min(newX, SCENE_WIDTH - mySize));
        newY = Math.max(0, Math.min(newY, SCENE_HEIGHT - mySize));

        let allowMove = true;
        for (const other of objects) {
            if (other.id === draggingId) continue;
            const isTouching = checkCollision(
                { x: newX, y: newY, scale: movingObj.scale, actorId: movingObj.actorId },
                { x: other.x, y: other.y, scale: other.scale, actorId: other.actorId }
            );
            const pairKey = [movingObj.id, other.id].sort().join(':');

            if (isTouching) {
                if (!activeCollisions.current.has(pairKey)) {
                    activeCollisions.current.add(pairKey);
                    const activeRules = getActiveRules();

                    // Regular COLLISION rules
                    const rules = activeRules.filter(r =>
                        r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                    );
                    for (const rule of rules) {
                        const shouldTrigger = rule.invert ? false : true;
                        if (shouldTrigger) {
                            // CHANCE CHECK
                            if (rule.chance && Math.random() > rule.chance) continue;

                            const hasBlock = rule.effects.some(e => e.type === InteractionType.BLOCK);
                            const hasPush = rule.effects.some(e => e.type === InteractionType.PUSH);
                            if (hasBlock || hasPush) allowMove = false;
                            if (!executingRuleIds.current.has(rule.id)) {
                                if (rule.soundId) playSound(rule.soundId);
                                if (rule.effects.length > 0) {
                                    executingRuleIds.current.add(rule.id);
                                    executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id)
                                        .then(() => { executingRuleIds.current.delete(rule.id); });
                                }
                            }
                        }
                    }

                    // HIT trigger (projectile collisions)
                    const movingIsProjectile = (movingObj.vx !== undefined && movingObj.vx !== 0) || (movingObj.vy !== undefined && movingObj.vy !== 0);
                    const otherIsProjectile = (other.vx !== undefined && other.vx !== 0) || (other.vy !== undefined && other.vy !== 0);

                    if (movingIsProjectile || otherIsProjectile) {
                        // When moving object (projectile) hits other
                        if (movingIsProjectile) {
                            const hitRules = activeRules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === other.actorId && r.objectId === movingObj.actorId
                            );
                            for (const rule of hitRules) {
                                if (!executingRuleIds.current.has(rule.id)) {
                                    if (rule.soundId) playSound(rule.soundId);
                                    if (rule.effects.length > 0) {
                                        executingRuleIds.current.add(rule.id);
                                        executeRuleEffects(rule.id, rule.effects, other.id, movingObj.id)
                                            .then(() => { executingRuleIds.current.delete(rule.id); });
                                    }
                                }
                            }
                        }

                        // When other object (projectile) hits moving
                        if (otherIsProjectile) {
                            const hitRules = activeRules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                            );
                            for (const rule of hitRules) {
                                if (!executingRuleIds.current.has(rule.id)) {
                                    if (rule.soundId) playSound(rule.soundId);
                                    if (rule.effects.length > 0) {
                                        executingRuleIds.current.add(rule.id);
                                        executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id)
                                            .then(() => { executingRuleIds.current.delete(rule.id); });
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                const isStillClose = checkCollision(
                    { x: newX, y: newY, scale: movingObj.scale, actorId: movingObj.actorId },
                    { x: other.x, y: other.y, scale: other.scale, actorId: other.actorId },
                    5
                );
                if (!isStillClose && activeCollisions.current.has(pairKey)) {
                    activeCollisions.current.delete(pairKey);

                    // --- COLLISION + INVERT (CONTINUOUS TOUCHING) ---
                    // This logic was previously for "EXIT COLLISION" but is now for continuous inverted collision.
                    // The original "EXIT COLLISION" logic is removed as per the user's instruction to insert new code.
                    // Assuming `matchActors`, `continuousCollisions`, and `triggerRule` are defined elsewhere or will be added.
                    // For now, I'll comment them out to maintain syntactical correctness if they are not defined.
                    /*
                    if (matchActors) {
                        const invertMatches = rules.filter(r =>
                            r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId && r.invert
                        );
     
                        for (const r of invertMatches) {
                            if (!continuousCollisions[r.id]) {
                                continuousCollisions[r.id] = new Set();
                            }
                            const pairKey = `${ movingObj.id }_${ other.id } `;
                            if (!continuousCollisions[r.id].has(pairKey)) {
                                continuousCollisions[r.id].add(pairKey);
                                triggerRule(r, movingObj.id, other.id);
                            }
                        }
                    }
                    */

                    // --- HIT TRIGGER (Projectile Collision Detection) ---
                    // Check if either object is a projectile (has velocity)
                    const movingIsProjectile = (movingObj.vx !== undefined && movingObj.vx !== 0) || (movingObj.vy !== undefined && movingObj.vy !== 0);
                    const otherIsProjectile = (other.vx !== undefined && other.vx !== 0) || (other.vy !== undefined && other.vy !== 0);

                    // Assuming `matchActors` and `triggerRule` are defined elsewhere or will be added.
                    // For now, I'll comment them out to maintain syntactical correctness if they are not defined.
                    /*
                    if (matchActors && (movingIsProjectile || otherIsProjectile)) {
                        // When A (projectile) hits B
                        if (movingIsProjectile) {
                            const hitRules = rules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === other.actorId && r.objectId === movingObj.actorId
                            );
                            hitRules.forEach(r => triggerRule(r, other.id, movingObj.id));
                        }
     
                        // When B (projectile) hits A
                        if (otherIsProjectile) {
                            const hitRules = rules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                            );
                            hitRules.forEach(r => triggerRule(r, movingObj.id, other.id));
                        }
                    }
                    */

                    // Original "EXIT COLLISION" logic (now after the new insertion)
                    const activeRules = getActiveRules();
                    const rules = activeRules.filter(r =>
                        r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId && r.invert
                    );
                    for (const rule of rules) {
                        if (!executingRuleIds.current.has(rule.id)) {
                            if (rule.soundId) playSound(rule.soundId);
                            executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id);
                        }
                    }
                }
            }
        }
        if (allowMove) {
            setObjects(prev => prev.map(o => {
                if (o.id === draggingId) return { ...o, x: newX, y: newY };
                return o;
            }));
        }
    };

    const handleMouseUp = () => { setDraggingId(null); };
    const currentScene = gameData.scenes.find(s => s.id === activeSceneId);

    return (
        <div className="fixed inset-0 bg-[#facc15] z-50 flex items-center justify-center font-['Gochi_Hand'] overflow-hidden">
            <div className="bg-[#333] p-4 md:p-8 rounded-[2.5rem] shadow-[15px_20px_0px_rgba(0,0,0,0.8)] relative flex flex-col items-center border-4 border-black max-h-screen scale-90 md:scale-100">
                <div className="bg-[#88919d] p-3 rounded-xl border-4 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-6">
                    <div
                        className={`bg-white relative overflow-hidden border-2 border-black/80 shadow-inner cursor-none ${shakeIntensity > 0 ? 'animate-shake' : ''} `}
                        style={{
                            width: '800px', height: '600px', maxWidth: '80vw', maxHeight: '60vh',
                            backgroundColor: gameData.backgroundColor, cursor: 'default',
                            transform: shakeIntensity > 0 ? `translate(${Math.random() * shakeIntensity - shakeIntensity / 2}px, ${Math.random() * shakeIntensity - shakeIntensity / 2}px)` : 'scale(1)'
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <BackgroundLayer image={currentScene?.backgroundImage} frames={currentScene?.backgroundFrames} />

                        {/* PARTICLES */}
                        {particles.map(p => (
                            <div
                                key={p.id}
                                className={`absolute rounded-sm ${p.type === 'SMOKE' && !p.actorId ? 'rounded-full blur-sm' : ''} `}
                                style={{
                                    left: p.x,
                                    top: p.y,
                                    width: p.size,
                                    height: p.size,
                                    backgroundColor: p.actorId ? 'transparent' : p.color,
                                    opacity: Math.min(1, p.life),
                                    transform: `rotate(${p.life * 360}deg)`
                                }}
                            >
                                {p.actorId && <img src={getActor(p.actorId)?.imageData} className="w-full h-full object-contain" />}
                            </div>
                        ))}
                        {/* UI OVERLAY */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-40 pointer-events-none">
                            {gameData.variables?.map(v => {
                                if (!v.isIconMode) return null;
                                const val = runtimeVariables[v.id] ?? v.initialValue;
                                const max = 10; // Cap at 10 for now to prevent overflow
                                const displayVal = Math.max(0, Math.min(val, max));

                                return (
                                    <div key={v.id} className="flex items-center gap-1 animate-in slide-in-from-left-4 fade-in duration-300">
                                        {Array.from({ length: displayVal }).map((_, i) => (
                                            <div key={i} className="w-8 h-8 drop-shadow-md">
                                                {v.icon ? (
                                                    <img src={v.icon} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full text-red-500">
                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>

                        {status === 'LOADING' && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center">
                                <Loader2 size={48} className="animate-spin text-gray-400" />
                                <p className="mt-2 font-bold text-gray-400 animate-pulse">LOADING ASSETS...</p>
                            </div>
                        )}

                        {status === 'READY' && (
                            <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center cursor-pointer" onClick={startGame}>
                                <button className="group relative">
                                    <div className="w-24 h-24 bg-[#22c55e] rounded-full border-[4px] border-black flex items-center justify-center shadow-[6px_6px_0px_black] group-hover:scale-110 group-active:scale-95 group-active:shadow-none transition-all">
                                        <Play size={48} className="text-white fill-white ml-2" />
                                    </div>
                                </button>
                                <p className="mt-6 font-bold text-3xl animate-bounce text-black">CLICK TO START!</p>
                            </div>
                        )}

                        <div className="w-full h-full relative" style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
                            {objects.map(obj => {
                                // MINIMAL DEBUG RENDER
                                // If this works, the crash was in the complex components.
                                // RESTORING ANIMATED SPRITE
                                // We keep SpeechBubble and VariableMonitor commented out to ensure stability.

                                const actor = getActor(obj.actorId);
                                if (!actor) return null;
                                const isDragging = draggingId === obj.id;
                                // FIX: Use ACTOR_SIZE and specific scaleX/scaleY properties
                                const currentScaleX = obj.scaleX !== undefined ? obj.scaleX : (obj.scale || 1.0);
                                const currentScaleY = obj.scaleY !== undefined ? obj.scaleY : (obj.scale || 1.0);
                                const displayWidth = ACTOR_SIZE * currentScaleX;
                                const displayHeight = ACTOR_SIZE * currentScaleY;

                                // DEBUG COLLISION BOX
                                const debugPoly = getCollisionPoly(obj);
                                // Convert poly to relative coordinates for rendering inside the div (or render absolute)
                                // Actually, getCollisionPoly returns absolute coordinates.
                                // We can render a separate SVG overlay or just a div.
                                // Let's render a div for the box.
                                const minX = Math.min(...debugPoly.map(p => p.x));
                                const minY = Math.min(...debugPoly.map(p => p.y));
                                const maxX = Math.max(...debugPoly.map(p => p.x));
                                const maxY = Math.max(...debugPoly.map(p => p.y));
                                const debugW = maxX - minX;
                                const debugH = maxY - minY;

                                if (!actor) return null;

                                const playingActor = obj.activeAnimation ? (obj.activeAnimation.playingActorId ? gameData.actors.find(a => a.id === obj.activeAnimation!.playingActorId) : actor) : undefined;

                                return (
                                    <div key={obj.id} className="absolute inset-0 pointer-events-none">
                                        {/* SHADOW (Only when in air) */}
                                        {(obj.z || 0) > 0 && (
                                            <div
                                                className="absolute bg-black/20 rounded-full blur-[2px]"
                                                style={{
                                                    left: obj.x + displayWidth * 0.2,
                                                    top: obj.y + displayHeight * 0.8,
                                                    width: displayWidth * 0.6,
                                                    height: displayHeight * 0.2,
                                                    zIndex: 5 + Math.floor(obj.y) // Ground level z-index
                                                }}
                                            />
                                        )}
                                        <div
                                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, obj); }}
                                            className={`absolute flex items-center justify-center select-none pointer-events-auto ${!obj.isLocked ? 'cursor-grab active:cursor-grabbing' : ''} ${obj.isEphemeral ? 'pointer-events-none' : ''} `}
                                            style={{
                                                left: obj.x,
                                                top: obj.y,
                                                width: obj.scaleX ? obj.scaleX * ACTOR_SIZE : (obj.scale || 1) * ACTOR_SIZE,
                                                height: obj.scaleY ? obj.scaleY * ACTOR_SIZE : (obj.scale || 1) * ACTOR_SIZE,
                                                transition: isDragging ? 'none' : 'transform 0.1s',
                                                transformOrigin: 'center',
                                                transform: `${isDragging ? 'scale(1.05)' : 'scale(1)'} ${obj.flipY ? 'scale(1, -1)' : ''}`, // Use scale for flip
                                                opacity: obj.isEphemeral ? 0.9 : 1
                                            }}
                                        >
                                            {/* {activeBubble && <SpeechBubble text={activeBubble.text} />} */}

                                            <AnimatedSprite
                                                baseActor={actor}
                                                playingActor={playingActor}
                                                isLooping={obj.activeAnimation?.isLoop}
                                                isEphemeral={obj.isEphemeral}
                                                onFinish={() => handleAnimationFinish(obj.id)}
                                                triggerTime={obj.activeAnimation?.startTime}
                                            />

                                            {/* ATTACHED VARIABLE MONITOR (HUD) - COMMENTED OUT */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {(status === 'WON' || status === 'LOST' || status === 'TRANSITION') && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300 p-4 z-50">
                                {status === 'WON' && (<div className="text-yellow-400 text-center"><Trophy size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" /><h2 className="text-6xl font-bold stroke-black drop-shadow-md">YOU WIN!</h2></div>)}
                                {status === 'LOST' && (<div className="text-red-500 text-center"><Skull size={80} strokeWidth={2} className="mx-auto mb-4 animate-pulse" /><h2 className="text-6xl font-bold stroke-black drop-shadow-md">GAME OVER</h2></div>)}
                                {status === 'TRANSITION' && (<div className="text-purple-400 text-center"><DoorOpen size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" /><h2 className="text-4xl font-bold">NEXT SCENE...</h2></div>)}
                                {(status === 'WON' || status === 'LOST') && (<button onClick={() => resetGame(activeSceneId)} className="mt-8 sketch-btn bg-white text-black px-8 py-2 text-2xl font-bold hover:scale-110 transition-transform">TRY AGAIN</button>)}
                            </div>
                        )
                        }
                    </div>
                </div>
                <div className="w-full flex justify-center items-center px-8 text-gray-500 gap-8">
                    <div className="flex items-center gap-2 text-white/50"><MousePointer className="animate-bounce" /><span>Use mouse to drag & click!</span></div>
                    <div className="flex gap-4">
                        <button onClick={() => resetGame(activeSceneId)} className="w-16 h-16 bg-red-500 rounded-full border-b-[6px] border-red-900 active:border-b-0 active:translate-y-1 shadow-xl flex items-center justify-center text-white font-bold text-xs">RESET</button>
                        <button onClick={onExit} className="w-16 h-16 bg-yellow-400 rounded-full border-b-[6px] border-yellow-700 active:border-b-0 active:translate-y-1 shadow-xl flex items-center justify-center text-yellow-900 font-bold text-xs">EXIT</button>
                    </div>
                </div>
            </div>
        </div>
    );
};