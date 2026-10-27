// Procedural Web Audio API sound effects for chalk writing and powder falling
// Zero external audio files required - works instantly and reliably anywhere!

class ChalkAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.writingNode = null;
        this.isWriting = false;
        this.volume = 0.4;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Realistic procedural chalk scratch / friction sound
    startWriting() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx || this.isWriting) return;

        this.isWriting = true;
        const ctx = this.ctx;

        // Create buffer with chalk noise
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Pink/granular noise simulating chalk scraping on slate
            const white = Math.random() * 2 - 1;
            output[i] = (white * 0.7) + (Math.random() * 0.3);
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Bandpass filter for characteristic chalkboard friction frequencies
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
        bandpass.Q.setValueAtTime(3.5, ctx.currentTime);

        // Highpass filter to eliminate low rumble
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(800, ctx.currentTime);

        // Subtle LFO for stroke modulation (mimics hand pressure variations)
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(12, ctx.currentTime); // 12Hz stroke jitter
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(500, ctx.currentTime);
        lfo.connect(bandpass.frequency);
        lfo.start();

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.18 * this.volume, ctx.currentTime + 0.08);

        whiteNoise.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();

        this.writingNode = {
            source: whiteNoise,
            lfo: lfo,
            gain: gainNode
        };
    }

    stopWriting() {
        if (!this.writingNode || !this.isWriting) return;
        this.isWriting = false;
        try {
            const ctx = this.ctx;
            const gain = this.writingNode.gain;
            const source = this.writingNode.source;
            const lfo = this.writingNode.lfo;
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
            setTimeout(() => {
                try {
                    source.stop();
                    lfo.stop();
                } catch(e) {}
            }, 70);
        } catch(e) {}
        this.writingNode = null;
    }

    // Realistic powder falling / whoosh sound
    playPowderFall() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;
        const duration = 1.4;

        // Noise buffer for chalk powder crumbling and drifting
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.8;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Lowpass sweep down as powder descends and settles
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(280, now + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);

        // Soft chalk tap when the first powder clump hits the wooden ledge
        setTimeout(() => {
            this.playChalkTap(0.15);
        }, 350);
        setTimeout(() => {
            this.playChalkTap(0.08);
        }, 550);
    }

    // Chalk tap on board
    playChalkTap(volScale = 0.2) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

        gain.gain.setValueAtTime(volScale * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Pronounce the greeting using Speech Synthesis with native accent
    speakGreeting(text, langCode) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // clear, teacher-paced
        utterance.pitch = 1.05;

        // Map language code to standard speech tags
        const langMap = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'kn': 'kn-IN',
            'ta': 'ta-IN',
            'te': 'te-IN'
        };

        const targetLang = langMap[langCode] || 'hi-IN';
        utterance.lang = targetLang;

        // Try to pick matching Indian voice if available
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(v => v.lang.startsWith(langCode) || v.lang.includes('IN'));
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        window.speechSynthesis.speak(utterance);
    }
}

window.chalkAudio = new ChalkAudioEngine();
