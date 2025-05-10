import { useEffect, useState, useRef } from 'react';
import TextBold from './TextBold';
import ShieldDisplay from './ShieldDisplay';
import GameState from '../../game-state';

function HeaderUI() {
	const [shields, setShields] = useState([
		{
			name: 'Lion',
			path: '/ui/shields/LionShield.png',
		},
		{
			name: 'Goat',
			path: '/ui/shields/GoatShield.png',
		},
		{
			name: 'Owl',
			path: '/ui/shields/OwlShield.png',
		},
		{
			name: 'Bear',
			path: '/ui/shields/BearShield.png',
		},
		{
			name: 'Horse',
			path: '/ui/shields/HorseShield.png',
		},
		{
			name: 'Bull',
			path: '/ui/shields/BullShield.png',
		},
		{
			name: 'Griffon',
			path: '/ui/shields/GriffonShield.png',
		},
		{
			name: 'Stag',
			path: '/ui/shields/StagShield.png',
		},
		{
			name: 'Crow',
			path: '/ui/shields/CrowShield.png',
		},
	]);

	// State for real-time timer updates
	const [elapsedTime, setElapsedTime] = useState('0.00');
	const [currentBout, setCurrentBout] = useState(0);
	const animationFrameRef = useRef();

	// Update timer every frame
	useEffect(() => {
		const updateTimer = () => {
			setElapsedTime(GameState.getElapsedTime());
			setCurrentBout(GameState.getBout());
			animationFrameRef.current = requestAnimationFrame(updateTimer);
		};

		// Start the animation loop
		animationFrameRef.current = requestAnimationFrame(updateTimer);

		// Cleanup on unmount
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	const leftShields = shields.slice(0, 4);
	const rightShields = shields.slice(5);

	return (
		<div className='banner relative'>
			<div
				className={`bg-black h-[60px] w-full flex justify-between absolute -z-10 top-0 px-2 pt-1`}>
				<div className={`flex flex-col`}>
					<TextBold
						text={`ELAPSED`}
						className={`text-blue text-[14px]`}
					/>
					<p className={`text-white text-[12px] font-medieval font-extrabold w-[90px]`}>
						{elapsedTime}
					</p>
				</div>
				<div className={`flex flex-col text-end`}>
					<TextBold
						text={`BOUT`}
						className={`text-red text-[14px]`}
					/>

					<p className={`text-white text-[12px] font-medieval font-extrabold tracking-widest`}>
						{currentBout + '/' + GameState.getTotalBouts()}
					</p>
				</div>
			</div>
			<div className={`w-full relative mt-2`}>
				<img
					src={`/ui/ScrollBanner.png`}
					className={`w-full absolute`}
					alt={`Scroll Header Banner`}
				/>
				<div className={`w-full flex justify-center  text-center relative`}>
					<div className={`w-fit flex space-x-6 relative mt-2`}>
						{leftShields.map((s, index) => (
							<div
								key={s.name}
								className='transform transition-transform'
								style={{
									transform: `translateY(${(leftShields.length - 1 - index) * 6}px)`,
									height: '100%',
								}}>
								<ShieldDisplay
									name={s.name}
									path={s.path}
								/>
							</div>
						))}
					</div>
					<TextBold
						text={`JOUST.`}
						className={`mx-8 mt-1 text-black text-[42px]`}
					/>
					<div className={`w-fit flex space-x-6 relative mt-2`}>
						{rightShields.map((s, index) => (
							<div
								key={s.name}
								className='transform transition-transform'
								style={{
									transform: `translateY(${index * 6}px)`,
									height: '100%',
								}}>
								<ShieldDisplay
									name={s.name}
									path={s.path}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default HeaderUI;
