export interface AudioSettings {
    bgmEnabled: boolean;
    soundEnabled: boolean;
    bgmVolume: number;
    soundVolume: number;
}

export class AudioService {
    private static instance: AudioService;
    private audioContext: AudioContext | null = null;
    private bgmAudio: HTMLAudioElement | null = null;
    private soundBuffers: Map<string, AudioBuffer> = new Map();
    private settings: AudioSettings = {
        bgmEnabled: true,
        soundEnabled: true,
        bgmVolume: 0.3,
        soundVolume: 0.5
    };

    public static getInstance(): AudioService {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }

    constructor() {
        this.loadSettings();
        this.initializeAudio();
    }

    private loadSettings(): void {
        const savedSettings = localStorage.getItem('gobang_audio_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    private saveSettings(): void {
        localStorage.setItem('gobang_audio_settings', JSON.stringify(this.settings));
    }

    private async initializeAudio(): Promise<void> {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // 预加载音效
            await this.preloadSounds();

            // 初始化背景音乐
            this.initializeBGM();
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    private async preloadSounds(): Promise<void> {
        const sounds = [
            { name: 'place_stone', url: this.generateToneBuffer(440, 0.1) },
            { name: 'win', url: this.generateToneBuffer(880, 0.3) },
            { name: 'click', url: this.generateToneBuffer(660, 0.05) },
            { name: 'error', url: this.generateToneBuffer(220, 0.2) }
        ];

        for (const sound of sounds) {
            try {
                this.soundBuffers.set(sound.name, sound.url);
            } catch (error) {
                console.warn(`Failed to load sound ${sound.name}:`, error);
            }
        }
    }

    private generateToneBuffer(frequency: number, duration: number): AudioBuffer {
        if (!this.audioContext) throw new Error('Audio context not initialized');

        const sampleRate = this.audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - (t / duration));
            channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }

        return buffer;
    }

    private initializeBGM(): void {
        // 使用简单的和弦序列作为背景音乐
        this.createBGMLoop();
    }

    private createBGMLoop(): void {
        if (!this.audioContext) return;

        const playChord = (frequencies: number[], duration: number) => {
            if (!this.audioContext) return;

            const gainNode = this.audioContext.createGain();
            gainNode.connect(this.audioContext.destination);
            gainNode.gain.value = this.settings.bgmVolume * 0.1;

            frequencies.forEach(freq => {
                const oscillator = this.audioContext!.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                oscillator.connect(gainNode);
                oscillator.start();
                oscillator.stop(this.audioContext!.currentTime + duration);
            });
        };

        // 简单的和弦进行
        const chordProgression = [
            [261.63, 329.63, 392.00], // C major
            [293.66, 369.99, 440.00], // D minor
            [329.63, 415.30, 493.88], // E minor
            [261.63, 329.63, 392.00], // C major
        ];

        let currentChord = 0;
        const playNextChord = () => {
            if (this.settings.bgmEnabled && this.audioContext) {
                playChord(chordProgression[currentChord], 2);
                currentChord = (currentChord + 1) % chordProgression.length;
                setTimeout(playNextChord, 3000);
            }
        };

        if (this.settings.bgmEnabled) {
            setTimeout(playNextChord, 1000);
        }
    }

    public playSound(soundName: string): void {
        if (!this.settings.soundEnabled || !this.audioContext) return;

        const buffer = this.soundBuffers.get(soundName);
        if (buffer) {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            gainNode.gain.value = this.settings.soundVolume;

            source.start();
        }
    }

    public updateSettings(newSettings: Partial<AudioSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    public getSettings(): AudioSettings {
        return { ...this.settings };
    }

    public async resumeAudioContext(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

export const audioService = AudioService.getInstance();
