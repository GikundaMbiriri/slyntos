

// A simple wrapper around the Web Audio API for beat generation

let audioCtx: AudioContext | null = null;
let schedulerInterval: number | null = null;
let tempo = 120.0;
// FIX: Update type to match readonly BEAT_PATTERNS from `as const`.
let currentPattern: { readonly kick: readonly number[]; readonly snare: readonly number[]; readonly hihat: readonly number[] } | null = null;
let nextNoteTime = 0.0;
let current16thNote = 0;

const BEAT_PATTERNS = {
    'hiphop': {
        kick:  [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    'rock': {
        kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    'electronic': {
        kick:  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    }
} as const;

export type BeatStyle = keyof typeof BEAT_PATTERNS;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
}

// --- Sound Synthesis ---
function playKick(time: number) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(150, time);
    gain.gain.setValueAtTime(1, time);

    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.start(time);
    osc.stop(time + 0.5);
}

function playSnare(time: number) {
    if (!audioCtx) return;
    const noise = audioCtx.createBufferSource();
    const bufferSize = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    noise.connect(noiseFilter);

    const noiseEnvelope = audioCtx.createGain();
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(audioCtx.destination);

    noiseEnvelope.gain.setValueAtTime(1, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.start(time);
    noise.stop(time + 0.2);
}

function playHihat(time: number) {
    if (!audioCtx) return;
    const noise = audioCtx.createBufferSource();
    const bufferSize = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 10000;
    
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 7000;

    noise.connect(bandpass);
    bandpass.connect(highpass);

    const gain = audioCtx.createGain();
    highpass.connect(gain);
    gain.connect(audioCtx.destination);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    noise.start(time);
    noise.stop(time + 0.05);
}


function scheduleNote() {
    if (!audioCtx || !currentPattern) return;
    
    const secondsPerBeat = 60.0 / tempo;
    const sixteenthNoteTime = secondsPerBeat / 4;

    if (currentPattern.kick[current16thNote]) {
        playKick(nextNoteTime);
    }
    if (currentPattern.snare[current16thNote]) {
        playSnare(nextNoteTime);
    }
    if (currentPattern.hihat[current16thNote]) {
        playHihat(nextNoteTime);
    }
    
    nextNoteTime += sixteenthNoteTime;
    current16thNote = (current16thNote + 1) % 16;
}

function scheduler() {
    if (!audioCtx) return;
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        scheduleNote();
    }
}

export const play = (style: BeatStyle, newTempo?: number) => {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (schedulerInterval) {
        clearInterval(schedulerInterval);
    }

    currentPattern = BEAT_PATTERNS[style];
    tempo = newTempo || 120;
    nextNoteTime = audioCtx.currentTime;
    current16thNote = 0;
    
    schedulerInterval = window.setInterval(scheduler, 25);
};

export const stop = () => {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
    currentPattern = null;
    if (audioCtx) {
        // Closing context releases resources
        audioCtx.close();
        audioCtx = null;
    }
};

export const setTempo = (newTempo: number) => {
    tempo = newTempo;
};