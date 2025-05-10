import { useEffect, useState, useRef } from 'react';
import TextBold from './TextBold';

function PennantPeg({ team, pts }) {
	// Determine which pennant to show based on team and points
	const getPennantSrc = () => {
		switch (pts) {
			case -1:
				return '/ui/pennants/MissPennant.svg';
			case 0:
				return null; // No pennant
			case 1:
				return team === 'blue'
					? '/ui/pennants/Blue1ptPennant.svg'
					: '/ui/pennants/Red1ptPennant.svg';
			case 2:
				return team === 'blue'
					? '/ui/pennants/Blue2ptPennant.svg'
					: '/ui/pennants/Red2ptPennant.svg';
			case 3:
				return '/ui/pennants/3ptPennant.svg';
			default:
				return null;
		}
	};

	const pennantSrc = getPennantSrc();

	return (
		<>
			<div className={`flex justify-center items-center w-[60px] relative`}>
				{/* Show the peg only when there's a pennant */}
				<div className='bg-darkbrown w-4 h-4 rounded-full z-10'></div>

				{/* Show the pennant if one should be displayed */}
				{pennantSrc && (
					<img
						src={pennantSrc}
						alt={`${team} ${pts} point pennant`}
						className='absolute top-1 z-20 transform '
						style={{ width: '100px', height: 'auto' }}
					/>
				)}
			</div>
		</>
	);
}

export default PennantPeg;
