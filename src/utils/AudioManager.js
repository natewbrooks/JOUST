// core/AudioManager.js
import * as THREE from 'three';

class AudioManager {
	constructor() {
		if (AudioManager.instance) return AudioManager.instance;
		AudioManager.instance = this;

		// Create an AudioListener
		this.listener = new THREE.AudioListener();

		// Create AudioLoader
		this.loader = new THREE.AudioLoader();

		// Store loaded audio buffers
		this.buffers = new Map(); // name → AudioBuffer

		// Store active sounds
		this.sounds = new Map(); // name → THREE.Audio object

		// Background music
		this.bgMusic = null;

		// Base path for audio files
		this.basePath = '/audio/'; // customize to match your public assets

		// Track if audio has been initialized with user gesture
		this.isInitialized = false;
		this.pendingMusic = null; // Store music to play after initialization

		// Default audio files to preload
		this.defaultAudioFiles = {
			bg: 'music/WildBoarInn.mp3',
			ouch: 'Ouch.mp3',
			cheer: 'Cheer.mp3',
			headshot: 'AnvilHit.mp3',
			neigh: 'HorseNeigh.mp3',
			boo: 'Boo.mp3',
		};

		// Set up user gesture listener to initialize audio
		this.setupUserGestureListener();

		// Preload default audio files
		this.preloadDefaultAudio();

		return this;
	}

	// Preload default audio files
	async preloadDefaultAudio() {
		try {
			await this.loadAll(this.defaultAudioFiles);
			console.log('Default audio files preloaded');

			// Queue background music to play after initialization
			this.playMusic('bg', { volume: 0.35 });
		} catch (error) {
			console.error('Failed to preload default audio:', error);
		}
	}

	// Set up listener for user gestures to initialize audio
	setupUserGestureListener() {
		const initializeAudio = async () => {
			if (!this.isInitialized) {
				// Resume the audio context
				const context = this.listener.context;

				if (context.state === 'suspended') {
					await context.resume();
				}

				this.isInitialized = true;
				console.log('Audio context initialized');

				// Play pending music if any
				if (this.pendingMusic) {
					this.playMusic(this.pendingMusic.name, this.pendingMusic.options);
					this.pendingMusic = null;
				}

				// Remove the event listeners once initialized
				document.removeEventListener('click', initializeAudio);
				document.removeEventListener('keydown', initializeAudio);
				document.removeEventListener('touchstart', initializeAudio);
			}
		};

		// Listen for common user interactions
		document.addEventListener('click', initializeAudio);
		document.addEventListener('keydown', initializeAudio);
		document.addEventListener('touchstart', initializeAudio);
	}

	// Method to manually initialize if needed
	async initialize() {
		if (!this.isInitialized) {
			const context = this.listener.context;

			if (context.state === 'suspended') {
				await context.resume();
			}

			this.isInitialized = true;
			console.log('Audio context manually initialized');
		}
	}

	// Method to attach listener to camera
	attachToCamera(camera) {
		camera.add(this.listener);
	}

	// Load audio file
	async load(name, file) {
		if (this.buffers.has(name)) return Promise.resolve();

		return new Promise((resolve, reject) => {
			this.loader.load(
				`${this.basePath}${file}`,
				(buffer) => {
					this.buffers.set(name, buffer);
					resolve();
				},
				(xhr) => {
					// Progress callback
					console.log(`Loading ${name}: ${((xhr.loaded / xhr.total) * 100).toFixed(1)}%`);
				},
				(error) => {
					console.error(`Error loading ${name}:`, error);
					reject(error);
				}
			);
		});
	}

	// Load multiple audio files
	async loadAll(sounds) {
		const promises = Object.entries(sounds).map(([name, file]) => this.load(name, file));
		await Promise.all(promises);
	}

	// Play a sound effect
	playSound(name, { loop = false, volume = 1, position = null } = {}) {
		if (!this.isInitialized) {
			console.warn('Audio not initialized yet. Please interact with the page first.');
			return null;
		}

		const buffer = this.buffers.get(name);
		if (!buffer) {
			console.warn(`Sound "${name}" not loaded`);
			return null;
		}

		// Create audio object
		const sound = position
			? new THREE.PositionalAudio(this.listener)
			: new THREE.Audio(this.listener);
		sound.setBuffer(buffer);
		sound.setLoop(loop);
		sound.setVolume(volume);

		// If position is provided and it's positional audio, set the reference distance
		if (position && sound instanceof THREE.PositionalAudio) {
			sound.setRefDistance(20);
			sound.position.copy(position);
		}

		// Start playing
		sound.play();

		// Store the sound
		this.sounds.set(name, sound);

		// Remove from map when finished (if not looping)
		if (!loop) {
			sound.onEnded = () => {
				this.sounds.delete(name);
			};
		}

		return sound;
	}

	// Stop a sound
	stopSound(name) {
		const sound = this.sounds.get(name);
		if (sound) {
			sound.stop();
			this.sounds.delete(name);
		}
	}

	// Play background music
	playMusic(name, options = {}) {
		if (!this.isInitialized) {
			console.log('Audio not initialized. Music will play after user interaction.');
			this.pendingMusic = { name, options };
			return;
		}

		this.stopMusic();

		const buffer = this.buffers.get(name);
		if (!buffer) {
			console.warn(`Music "${name}" not loaded`);
			return;
		}

		let volume = options.volume;
		if (typeof volume !== 'number' || !isFinite(volume)) {
			console.warn(`Invalid volume "${volume}" passed to playMusic. Defaulting to 0.5`);
			volume = 0.5;
		}

		this.bgMusic = new THREE.Audio(this.listener);
		this.bgMusic.setBuffer(buffer);
		this.bgMusic.setLoop(true);
		this.bgMusic.setVolume(volume); // safe now
		this.bgMusic.play();
	}

	// Stop background music
	stopMusic() {
		if (this.bgMusic) {
			this.bgMusic.stop();
			this.bgMusic = null;
		}
	}

	// Set music volume
	setMusicVolume(value) {
		if (this.bgMusic) {
			this.bgMusic.setVolume(value);
		}
	}

	// Stop all sounds and music
	stopAll() {
		// Stop all individual sounds
		this.sounds.forEach((sound) => sound.stop());
		this.sounds.clear();

		// Stop background music
		this.stopMusic();

		// Clear pending music
		this.pendingMusic = null;
	}

	// Get the audio listener (useful for camera attachment)
	getListener() {
		return this.listener;
	}

	// Check if audio is initialized
	isAudioInitialized() {
		return this.isInitialized;
	}

	// Convenience methods for specific sounds
	playOuch(volume = 1) {
		return this.playSound('ouch', { volume, loop: false });
	}

	playCheer(volume = 1) {
		return this.playSound('cheer', { volume, loop: false });
	}

	playHeadshot(volume = 1) {
		return this.playSound('headshot', { volume, loop: false });
	}

	playNeigh(volume = 1) {
		return this.playSound('neigh', { volume, loop: false });
	}

	playBoo(volume = 1) {
		return this.playSound('boo', { volume, loop: false });
	}

	// Play 3D positional sound (useful for spatial audio)
	play3DSound(name, position, options = {}) {
		const defaultOptions = { volume: 1, loop: false };
		return this.playSound(name, {
			...defaultOptions,
			...options,
			position,
		});
	}

	// Get the audio listener (useful for camera attachment)
	getListener() {
		return this.listener;
	}

	// Check if audio is initialized
	isAudioInitialized() {
		return this.isInitialized;
	}
}

const audioManager = new AudioManager();
export default audioManager;
