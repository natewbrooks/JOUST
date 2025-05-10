import { useEffect, useState, useRef } from 'react';
import TextBold from './TextBold';

function CrossedLances() {
	return (
		<>
			<div className={`w-[120px] h-[120px] relative -top-10  z-50`}>
				<img
					src={'/ui/BlueLance.svg'}
					className={`absolute top-0`}
				/>
				<img
					src={'/ui/RedLance.svg'}
					className={`absolute top-0`}
				/>
			</div>
		</>
	);
}

export default CrossedLances;
