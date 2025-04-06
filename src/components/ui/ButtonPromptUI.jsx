import { useEffect, useRef } from 'react';
import gsap from 'gsap';

function ButtonPromptUI({ letter, isPressed = false, isActive = false }) {
	const buttonRef = useRef();
	const loopTween = useRef();

	useEffect(() => {
		if (!isActive) {
			// Preview idle animation (slow bounce between 8px and 1px border)
			loopTween.current = gsap.to(buttonRef.current, {
				borderBottomWidth: '1px',
				duration: 0.2,
				repeat: -1,
				yoyo: true,
				ease: 'power1.inOut',
			});
		}

		return () => {
			if (loopTween.current) loopTween.current.kill();
		};
	}, [isActive]);

	useEffect(() => {
		if (isActive && loopTween.current) {
			loopTween.current.kill(); // Stop the idle bounce
		}

		if (isActive) {
			// Fast responsive snap when key is pressed
			gsap.to(buttonRef.current, {
				borderBottomWidth: isPressed ? '1px' : '8px',
				duration: isPressed ? 0.01 : 0.05, // faster when pressing down
				ease: 'power2.out',
			});
		}
	}, [isPressed, isActive]);

	return (
		<button
			ref={buttonRef}
			className='bg-cream font-medieval font-bold text-4xl px-4 py-1 h-[60px] border-b-[10px] border-darkcream rounded-md'>
			{letter}
		</button>
	);
}

export default ButtonPromptUI;
