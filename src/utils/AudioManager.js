// core/AudioManager.js
import * as THREE from 'three';

class AudioManager {
	constructor() {
		if (AudioManager.instance) return AudioManager.instance;
		AudioManager.instance = this;

		this.listener = new THREE.AudioListener();
		this.loader = new THREE.AudioLoader();
		this.buffers = new Map();
		this.sounds = new Map();
		this.bgMusic = null;
		this.basePath = '/audio/';
		this.isInitialized = false;
		this.pendingMusic = null;
		this.paused = false;
		this.muted = false;
		this.volumeScale = 1.0;

		this.defaultAudioFiles = {
			bg: 'music/WildBoarInn.mp3',
			ouch: 'Ouch.mp3',
			cheer: 'Cheer.mp3',
			headshot: 'AnvilHit.mp3',
			neigh: 'HorseNeigh.mp3',
			boo: 'Boo.mp3',
			woosh: 'Woosh.mp3',
			three: '/countdown/three.mp3',
			two: '/countdown/two.mp3',
			one: '/countdown/one.mp3',
			zero: '/countdown/zero.mp3',
			victory: '/outcomes/victory.mp3',
			defeat: '/outcomes/defeat.mp3',
			tie: '/outcomes/tie.mp3',
			drumroll: '/outcomes/drumroll.mp3',
			trumpet: '/outcomes/trumpet.mp3',
		};

		this.setupUserGestureListener();
		this.preloadDefaultAudio();
		return this;
	}

	setMuted(value) {
		this.muted = value;
		// Apply mute state to all active sounds
		this.sounds.forEach((sound) => {
			const baseVolume = sound.userData.baseVolume || 1;
			sound.setVolume(value ? 0 : baseVolume * this.volumeScale);
		});

		if (this.bgMusic) {
			const musicBaseVolume = this.bgMusic.userData.baseVolume || 0.2;
			this.bgMusic.setVolume(value ? 0 : musicBaseVolume * this.volumeScale);
		}
	}

	isMuted() {
		return this.muted;
	}

	async preloadDefaultAudio() {
		try {
			await this.loadAll(this.defaultAudioFiles);
			console.log('Default audio files preloaded');
			this.playMusic('bg', { volume: 0.2 });
		} catch (error) {
			console.error('Failed to preload default audio:', error);
		}
	}

	setupUserGestureListener() {
		const initializeAudio = async () => {
			if (!this.isInitialized) {
				const context = this.listener.context;
				if (context.state === 'suspended') await context.resume();
				this.isInitialized = true;
				console.log('Audio context initialized');
				if (this.pendingMusic) {
					this.playMusic(this.pendingMusic.name, this.pendingMusic.options);
					this.pendingMusic = null;
				}
				document.removeEventListener('click', initializeAudio);
				document.removeEventListener('keydown', initializeAudio);
				document.removeEventListener('touchstart', initializeAudio);
			}
		};
		document.addEventListener('click', initializeAudio);
		document.addEventListener('keydown', initializeAudio);
		document.addEventListener('touchstart', initializeAudio);
	}

	async initialize() {
		if (!this.isInitialized) {
			const context = this.listener.context;
			if (context.state === 'suspended') await context.resume();
			this.isInitialized = true;
			console.log('Audio context manually initialized');
		}
	}

	attachToCamera(camera) {
		camera.add(this.listener);
	}

	async load(name, file) {
		if (this.buffers.has(name)) return Promise.resolve();
		return new Promise((resolve, reject) => {
			this.loader.load(
				`${this.basePath}${file}`,
				(buffer) => {
					this.buffers.set(name, buffer);
					resolve();
				},
				(xhr) => console.log(`Loading ${name}: ${((xhr.loaded / xhr.total) * 100).toFixed(1)}%`),
				reject
			);
		});
	}

	async loadAll(sounds) {
		const promises = Object.entries(sounds).map(([name, file]) => this.load(name, file));
		await Promise.all(promises);
	}

	setVolumeScale(scale) {
		// Ensure scale is between 0 and 1
		this.volumeScale = Math.max(0, Math.min(1, scale));

		// Apply new scale to all currently playing sounds
		this.sounds.forEach((sound) => {
			// Get the sound's base volume (or use 1 if not set)
			const baseVolume = sound.userData.baseVolume || 1;
			sound.setVolume(this.muted ? 0 : baseVolume * this.volumeScale);
		});

		// Apply to background music
		if (this.bgMusic) {
			const musicBaseVolume = this.bgMusic.userData.baseVolume || 0.2;
			this.bgMusic.setVolume(this.muted ? 0 : musicBaseVolume * this.volumeScale);
		}

		return this.volumeScale;
	}

	getVolumeScale() {
		return this.volumeScale;
	}

	playSound(name, { loop = false, volume = 1, position = null } = {}) {
		if (!this.isInitialized) return null;
		const buffer = this.buffers.get(name);
		if (!buffer) return null;

		const sound = position
			? new THREE.PositionalAudio(this.listener)
			: new THREE.Audio(this.listener);
		sound.setBuffer(buffer);
		sound.setLoop(loop);

		// Store the base volume in userData for reference
		sound.userData.baseVolume = volume;

		// Apply volume with scaling
		sound.setVolume(this.muted ? 0 : volume * this.volumeScale);

		if (position && sound instanceof THREE.PositionalAudio) {
			sound.setRefDistance(20);
			sound.position.copy(position);
		}
		sound.play();
		this.sounds.set(name, sound);
		if (!loop) sound.onEnded = () => this.sounds.delete(name);
		return sound;
	}

	stopSound(name) {
		const sound = this.sounds.get(name);
		if (sound) {
			sound.stop();
			this.sounds.delete(name);
		}
	}

	playMusic(name, options = {}) {
		if (!this.isInitialized) {
			this.pendingMusic = { name, options };
			return;
		}
		this.stopMusic();
		const buffer = this.buffers.get(name);
		if (!buffer) return;

		let volume = options.volume;
		if (typeof volume !== 'number' || !isFinite(volume)) volume = 0.5;

		this.bgMusic = new THREE.Audio(this.listener);
		this.bgMusic.setBuffer(buffer);
		this.bgMusic.setLoop(true);

		// Store the base volume in userData for reference
		this.bgMusic.userData.baseVolume = volume;

		// Apply volume with scaling
		this.bgMusic.setVolume(this.muted ? 0 : volume * this.volumeScale);
		this.bgMusic.play();
	}

	stopMusic() {
		if (this.bgMusic) {
			this.bgMusic.stop();
			this.bgMusic = null;
		}
	}

	setMusicVolume(value) {
		if (this.bgMusic) {
			this.bgMusic.userData.baseVolume = value;
			this.bgMusic.setVolume(this.muted ? 0 : value * this.volumeScale);
		}
	}

	setPause(toggle = false, allowMusic = false) {
		const previousPaused = this.paused;

		// Toggle if requested
		if (toggle) {
			this.paused = !this.paused;
		} else {
			this.paused = true;
		}

		// Only trigger side effects if pause state changed
		if (this.paused !== previousPaused) {
			// notifyListeners('stateChange', {  });

			if (this.paused) {
				if (allowMusic) {
					audioManager.pauseAllExceptMusic();
				} else {
					audioManager.pauseAll();
				}
			} else {
				audioManager.resumeAll();
			}
		}

		return this.paused;
	}

	pauseAllExceptMusic() {
		for (const [name, sound] of this.sounds.entries()) {
			if (sound.isPlaying) {
				sound.pause();
				sound._wasPaused = true;
			}
		}
		// Leave bgMusic playing
	}

	pauseAll() {
		for (const [name, sound] of this.sounds.entries()) {
			if (sound.isPlaying) {
				sound.pause(); // Pause (does not reset time like .stop())
				sound._wasPaused = true; // Track that we paused it manually
			}
		}
		if (this.bgMusic && this.bgMusic.isPlaying) {
			this.bgMusic.pause();
			this.bgMusic._wasPaused = true;
		}
	}

	resumeAll() {
		for (const [name, sound] of this.sounds.entries()) {
			if (sound._wasPaused) {
				sound.play(); // Resume playback
				sound._wasPaused = false;
			}
		}
		if (this.bgMusic && this.bgMusic._wasPaused) {
			this.bgMusic.play();
			this.bgMusic._wasPaused = false;
		}
	}

	stopAll() {
		this.sounds.forEach((sound) => sound.stop());
		this.sounds.clear();
		this.stopMusic();
		this.pendingMusic = null;
	}

	getListener() {
		return this.listener;
	}

	isAudioInitialized() {
		return this.isInitialized;
	}

	playOuch(volume = 1) {
		return this.playSound('ouch', { volume });
	}
	playCheer(volume = 1) {
		return this.playSound('cheer', { volume });
	}
	playHeadshot(volume = 1) {
		return this.playSound('headshot', { volume });
	}
	playNeigh(volume = 1) {
		return this.playSound('neigh', { volume });
	}
	playBoo(volume = 1) {
		return this.playSound('boo', { volume });
	}
	play3DSound(name, position, options = {}) {
		return this.playSound(name, { ...options, position });
	}
}

const audioManager = new AudioManager();
export default audioManager;
