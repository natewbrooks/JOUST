import { useEffect, useState } from 'react';
import { HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';
import audioManager from '../utils/AudioManager';

function HomePage({ onPlay }) {
	const [audioMuted, setAudioMuted] = useState(false);
	const [volumeLevel, setVolumeLevel] = useState(1.0); // Default to 100%

	// Initialize state values from AudioManager on component mount
	useEffect(() => {
		setAudioMuted(audioManager.isMuted());
		setVolumeLevel(audioManager.getVolumeScale());
	}, []);

	// Add function to toggle audio
	const toggleAudio = () => {
		const newMutedState = !audioMuted;
		setAudioMuted(newMutedState);
		audioManager.setMuted(newMutedState);
	};

	// Handle volume slider change
	const handleVolumeChange = (e) => {
		const newVolume = parseFloat(e.target.value);
		setVolumeLevel(newVolume);
		audioManager.setVolumeScale(newVolume);
	};

	// Handle play button click
	const handlePlayClick = () => {
		// Play button click sound
		// audioManager.playSound('buttonClick', { volume: 0.5 });

		// Trigger start game in parent component
		if (onPlay) {
			onPlay();
		}
	};

	return (
		<div className='w-full h-full fixed'>
			<img
				src='/ui/homepage/HomePage.png'
				className='w-full h-full absolute'
				alt='Medieval Jousting Game Homepage'
			/>
			<div className='absolute top-1 right-2 flex flex-col items-center'>
				{/* Audio icon button */}
				<div
					className='cursor-pointer mb-1'
					onClick={toggleAudio}>
					{audioMuted ? (
						<HiSpeakerXMark
							size={32}
							className='text-cream'
						/>
					) : (
						<HiSpeakerWave
							size={32}
							className='text-cream'
						/>
					)}
				</div>

				{/* Volume slider */}
				<input
					type='range'
					min='0'
					max='1'
					step='0.01'
					value={volumeLevel}
					onChange={handleVolumeChange}
					className='text-darkcream w-16 h-4'
					disabled={audioMuted}
				/>
			</div>
			<div className='h-full w-full flex items-end justify-center absolute p-30'>
				<img
					src='/ui/homepage/PlayButton.png'
					className='w-[360px] h-[90px] z-100 cursor-pointer hover:opacity-90 active:scale-[99%] mb-12'
					alt='Play Button'
					onClick={handlePlayClick}
				/>
			</div>
		</div>
	);
}

export default HomePage;
