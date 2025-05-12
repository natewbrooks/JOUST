import { useEffect, useState, useRef } from 'react';
import TextBold from './TextBold';
import { useModal } from '../../contexts/ModalContext';

function CountdownModal({ countdown }) {
	return (
		<>
			{countdown > 0 && (
				<div className='w-[300px] h-[50px] flex items-center justify-center flex-col bg-darkblue p-4 shadow-md text-cream'>
					<TextBold
						text={
							countdown == 3 ? 'MARKS' : countdown == 2 ? 'READY' : countdown == 1 ? 'JOUST' : ''
						}
						className={`text-3xl relative top-1`}
					/>
				</div>
			)}
		</>
	);
}

export default CountdownModal;
