import { useEffect, useState, useRef } from 'react';
import SplitScreenUI from './components/SplitScreenUI';
import TextBold from './components/TextBold';
import HeaderUI from './components/HeaderUI';
import gameStateManager from '../GameStateManager';
import Confetti from 'react-confetti';
import { useModal } from '../contexts/ModalContext';
import GameMenu from './components/GameMenu';
import audioManager from '../utils/AudioManager';
import CountdownModal from './components/CountdownModal';
import { HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';

function HomePage() {
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

	return (
		<>
			<div className={`w-full h-full fixed`}>
				<img
					src={`/ui/homepage/HomePage.png`}
					className={`w-full h-full absolute `}
				/>
				<div className='absolute top-1 right-2 flex flex-col items-center'>
					{/* Audio icon button */}
					<div
						className='cursor-pointer mb-1'
						onClick={toggleAudio}>
						{audioMuted ? (
							<HiSpeakerXMark
								size={32}
								className={`text-cream`}
							/>
						) : (
							<HiSpeakerWave
								size={32}
								className={`text-cream`}
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
						className={`text-darkcream w-16 h-4`}
						disabled={audioMuted}
					/>
				</div>
				<div className={`h-full w-full flex items-end justify-center absolute p-30  `}>
					<img
						src={`/ui/homepage/PlayButton.png`}
						className={`w-[360px] h-[90px] z-100 cursor-pointer hover:opacity-90 active:scale-[99%]`}
					/>
				</div>
			</div>
		</>
	);
}

export default HomePage;
