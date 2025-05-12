import { useState, useEffect } from 'react';
import { useModal } from '../../contexts/ModalContext';
import TextBold from './TextBold';
import gameStateManager from '../../GameStateManager';
import { HiSpeakerXMark, HiSpeakerWave } from 'react-icons/hi2';
import audioManager from '../../utils/AudioManager';

function GameMenu({ modalID, winner }) {
	const { closeModal } = useModal();
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

	// Add function to resume game
	const resumeGame = () => {
		gameStateManager.setPause(false);
		audioManager.setPause(false); // This line was missing - add it to unpause audio
		handleClose();
	};

	// Add function to start a new game
	const startNewGame = () => {
		gameStateManager.resetGame();
		gameStateManager.setPause(false);
		audioManager.setPause(false);
		gameStateManager.startBout();
		handleClose();
	};

	const exitToHome = () => {
		// Logic to exit to home
		// Make sure to unpause audio and game state before navigating
		gameStateManager.setPause(false);
		audioManager.setPause(false);
		handleClose();
		// Navigation logic would go here
	};

	const handleClose = () => {
		if (modalID && typeof modalID === 'function') {
			closeModal(modalID());
		}
	};

	return (
		<div className='w-[500px] h-[250px] flex flex-col bg-cream p-4 shadow-md text-black'>
			<div className='relative w-full flex justify-center mb-2'>
				<TextBold
					text='GAME MENU'
					className='text-2xl'
				/>
				<div className='absolute top-1 right-2 flex flex-col items-center'>
					{/* Audio icon button */}
					<div
						className='cursor-pointer mb-1'
						onClick={toggleAudio}>
						{audioMuted ? <HiSpeakerXMark size={20} /> : <HiSpeakerWave size={20} />}
					</div>

					{/* Volume slider */}
					<input
						type='range'
						min='0'
						max='1'
						step='0.01'
						value={volumeLevel}
						onChange={handleVolumeChange}
						className='w-16 h-4'
						disabled={audioMuted}
					/>
				</div>
			</div>

			<div className='h-full w-full flex flex-col justify-end items-end'>
				{winner ? (
					<button
						onClick={startNewGame}
						className='px-4 py-2 cursor-pointer hover:bg-black/10 h-fit w-full'>
						<p className='text-xl font-medieval font-extrabold'>New Game</p>
					</button>
				) : (
					<button
						onClick={resumeGame}
						className='px-4 py-2 cursor-pointer hover:bg-black/10 h-fit w-full'>
						<p className='text-xl font-medieval font-extrabold'>Resume Game</p>
					</button>
				)}
				<button
					onClick={exitToHome}
					className='px-4 py-2 cursor-pointer hover:bg-black/10 h-fit w-full'>
					<p className='text-xl font-medieval font-extrabold'>Exit to Home</p>
				</button>
			</div>
		</div>
	);
}

export default GameMenu;
