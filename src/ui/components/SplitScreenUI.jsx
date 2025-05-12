import { useEffect, useState, useRef } from 'react';
import TextBold from './TextBold';
import CrossedLances from './CrossedLances';
import PennantPeg from './PennantPeg';
import GameState from '../../game-state';

function SplitScreenUI() {
	const [boutMetadata, setBoutMetadata] = useState({});
	const [redScore, setRedScore] = useState(0);
	const [blueScore, setBlueScore] = useState(0);

	// Subscribe to game state changes
	useEffect(() => {
		// Listen for ANY bout data change (including misses)
		const unsubscribeBoutDataChanged = GameState.on('boutDataChanged', (data) => {
			// Update bout metadata whenever ANY data changes
			setBoutMetadata((prev) => ({
				...prev,
				...data.allMetadata,
			}));

			// Also update scores in case they changed
			setRedScore(GameState.getPoints('red'));
			setBlueScore(GameState.getPoints('blue'));
		});

		// Update bout metadata and scores when bouts end
		const unsubscribeBoutEnd = GameState.on('boutEnd', (data) => {
			setBoutMetadata((prev) => ({
				...prev,
				[data.bout]: data.metadata,
			}));

			// Update scores when a bout ends
			setRedScore(GameState.getPoints('red'));
			setBlueScore(GameState.getPoints('blue'));
		});

		// Listen for immediate point changes (for positive points)
		const unsubscribePointsChanged = GameState.on('pointsChanged', (data) => {
			// Update scores immediately when points are earned
			setRedScore(GameState.getPoints('red'));
			setBlueScore(GameState.getPoints('blue'));
		});

		// Listen for bout start
		const unsubscribeBoutStart = GameState.on('boutStart', (data) => {
			// Bout start - we don't need to pre-initialize because it will be handled by boutDataChanged
			console.log(`Bout ${data.bout} started`);
		});

		// Initialize with current state
		const currentMetadata = GameState.getBoutMetadata();
		setBoutMetadata(currentMetadata);
		setRedScore(GameState.getPoints('red'));
		setBlueScore(GameState.getPoints('blue'));

		// Cleanup
		return () => {
			unsubscribeBoutDataChanged();
			unsubscribeBoutEnd();
			unsubscribePointsChanged();
			unsubscribeBoutStart();
		};
	}, []);

	// Generate pennant pegs for each team
	const generatePennantPegs = (team, totalBouts = 5) => {
		const pegs = [];

		// For red team, we want to reverse the order
		// Bout 1 should appear on the right, bout 5 on the left (toward center)
		const boutOrder =
			team === 'red'
				? Array.from({ length: totalBouts }, (_, i) => totalBouts - i) // [5, 4, 3, 2, 1]
				: Array.from({ length: totalBouts }, (_, i) => i + 1); // [1, 2, 3, 4, 5]

		for (const bout of boutOrder) {
			const metadata = boutMetadata[bout];
			let pts = 0;

			// Safely access the metadata with fallbacks
			if (metadata && metadata[team] && typeof metadata[team].pts_earned === 'number') {
				pts = metadata[team].pts_earned;
			}

			pegs.push(
				<PennantPeg
					key={`${team}-bout-${bout}`}
					team={team}
					pts={pts}
				/>
			);
		}

		return pegs;
	};

	const totalBouts = GameState.getTotalBouts();

	return (
		<div className={`absolute w-full h-full top-[65%]`}>
			<div className='w-full h-[200px]'>
				<div
					className={`w-fit flex flex-col justify-center items-start -top-16 -left-10 absolute z-50`}>
					<img
						src={'/ui/BlueTeamBanner.png'}
						className={`scale-80`}
						alt={`Blue Team Banner`}
					/>
					<div className={`flex space-x-4 w-fit relative -right-18 z-50`}>
						{generatePennantPegs('blue', totalBouts)}
					</div>
				</div>

				<div
					className={`w-fit flex flex-col justify-center items-end -top-16 -right-10 absolute z-50`}>
					<img
						src={'/ui/RedTeamBanner.png'}
						className={`scale-80`}
					/>
					<div className={`flex space-x-4 w-fit relative -left-18 z-50`}>
						{generatePennantPegs('red', totalBouts)}
					</div>
				</div>

				<div className={`absolute w-full flex  items-center justify-center h-fit`}>
					<img
						src={'/ui/HorizontalWoodenBeam.png'}
						className='relative scale-x-105 w-full z-0 h-[100px]'
						alt='Beam'
					/>
					<div className={`absolute w-full flex justify-center items-center h-full pt-2`}>
						<TextBold
							text={blueScore}
							className={`text-darkbrown text-[42px]`}
						/>
						<CrossedLances />
						<TextBold
							text={redScore}
							className={`text-darkbrown text-[42px]`}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default SplitScreenUI;
