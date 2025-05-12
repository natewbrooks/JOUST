import { useEffect, useState, useRef } from 'react';
import SplitScreenUI from './components/SplitScreenUI';
import TextBold from './components/TextBold';
import HeaderUI from './components/HeaderUI';
import GameState from '../game-state';

function UILayout() {
	const [countdown, setCountdown] = useState(3);
	useEffect(() => {
		GameState.on('countdown', (data) => {
			setCountdown(data.timer);
		});
	}, []);
	return (
		<>
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
					<div className='w-full flex justify-center items-center'>
						{countdown > 0 && (
							<div className={`relative top-1 font-medieval font-extrabold text-4xl`}>
								{countdown == 3
									? 'MARKS!'
									: countdown == 2
									? 'READY!'
									: countdown == 1
									? 'JOUST!!'
									: ''}
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

export default UILayout;
