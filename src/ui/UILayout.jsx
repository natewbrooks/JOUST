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

function UILayout() {
	const [countdown, setCountdown] = useState(3);
	const [winner, setWinner] = useState(null);

	const { openModal, closeModal } = useModal();
	const menuModalRef = useRef(null);
	const menuLockedOpen = useRef(false);

	useEffect(() => {
		gameStateManager.on('countdown', (data) => {
			setCountdown(data.timer);
			console.log(data.timer);
		});

		gameStateManager.on('boutStart', (data) => {
			setWinner(false);
		});

		gameStateManager.on('winnerRevealed', (data) => {
			setWinner(data.winner);

			setTimeout(() => {
				menuLockedOpen.current = true;
				let modalID = null;
				const element = (
					<GameMenu
						modalID={() => modalID}
						winner={data.winner}
					/>
				);
				modalID = openModal(element);
				menuModalRef.current = modalID;
				// gameStateManager.setPause(false);
				// audioManager.setPause(false);
			}, 6000);
		});
	}, []);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'Escape') {
				// If locked by winner, don't close it
				if (menuLockedOpen.current) return;

				// audioManager.setPause(!audioManager.isPaused());

				// Toggle menu
				if (menuModalRef.current) {
					closeModal(menuModalRef.current);
					menuModalRef.current = null;
					gameStateManager.setPause(false);
				} else {
					const id = openModal(<GameMenu modalID={() => id} />);
					menuModalRef.current = id;
					gameStateManager.setPause(true);
					// audioManager.setPause(true, true);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	const confettiColors =
		winner === 'red'
			? ['#EB5D57', '#BF423D']
			: winner === 'blue'
			? ['#03838F', '#284861']
			: ['#EB5D57', '#BF423D', '#03838F', '#284861'];

	return (
		<>
			{winner && (
				<Confetti
					numberOfPieces={400}
					recycle={true}
					width={window.innerWidth}
					height={window.innerHeight}
					confettiSource={{
						x: 0,
						y: 80, // Y offset from the top
						w: window.innerWidth,
						h: 0, // Line emitter, not a box
					}}
					colors={confettiColors} // red or blue
				/>
			)}

			<div
				className='ui-layer'
				style={{ zIndex: 100 }}>
				<HeaderUI />

				<div className='absolute top-0 w-full h-[calc(70%+4px)] z-80'>
					<div className='relative flex justify-between w-full h-full'>
						{/* Blue Bear Shields (left side) */}
						<div className='flex flex-col justify-end h-full pl-9 space-y-6 pb-32'>
							<img
								src='/ui/shields/side/BearSideShield.png'
								alt='Bear Side Shield 1'
								className='z-80 h-[120px]'
							/>
							<img
								src='/ui/shields/side/BearSideShield.png'
								alt='Bear Side Shield 2'
								className='z-80 h-[120px]'
							/>
							<img
								src='/ui/shields/side/BearSideShield.png'
								alt='Bear Side Shield 3'
								className='z-80 h-[120px]'
							/>
						</div>

						{/* Red Lion Shields (right side) */}
						<div className='flex flex-col justify-end h-full pr-9 space-y-6 pb-32'>
							<img
								src='/ui/shields/side/LionSideShield.png'
								alt='Lion Side Shield 1'
								className='z-80 h-[120px]'
							/>
							<img
								src='/ui/shields/side/LionSideShield.png'
								alt='Lion Side Shield 2'
								className='z-80 h-[120px]'
							/>
							<img
								src='/ui/shields/side/LionSideShield.png'
								alt='Lion Side Shield 3'
								className='z-80 h-[120px]'
							/>
						</div>
					</div>
				</div>

				<img
					src={'/ui/VerticalWoodenBeam.png'}
					className='w-[100px] absolute h-screen scale-y-120 top-0 -translate-x-6'
					alt='Wooden Beam Left'
				/>

				<img
					src={'/ui/VerticalWoodenBeam.png'}
					className='w-[100px] h-screen scale-y-120 absolute right-0 top-0 translate-x-6 rotate-180'
					alt='Wooden Beam Right'
				/>

				<SplitScreenUI />

				<div className='center-screen'>
					<div className={`flex w-full justify-center items-center`}>
						<CountdownModal countdown={countdown} />
					</div>
				</div>
			</div>
		</>
	);
}

export default UILayout;
