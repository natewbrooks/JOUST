import { useEffect, useState, useRef } from 'react';
import GameState from './game-state';
import game from './core/Game';
import UILayout from './ui/UILayout';

function App() {
	const [playerMPH, setPlayerMPH] = useState(0);
	const [opponentMPH, setOpponentMPH] = useState(0);
	const [countdown, setCountdown] = useState(3);

	const containerRef = useRef(null);

	useEffect(() => {
		const canvas = game.canvas;

		if (containerRef.current && canvas && !containerRef.current.contains(canvas)) {
			// Append canvas to container
			containerRef.current.appendChild(canvas);

			// Make both the container and canvas focusable
			containerRef.current.tabIndex = 0;
			canvas.tabIndex = 0;

			// Style the canvas
			canvas.style.position = 'fixed';
			canvas.style.top = '0';
			canvas.style.left = '0';
			canvas.style.width = '100vw';
			canvas.style.height = '100vh';
			canvas.style.zIndex = '0';
			canvas.style.cursor = 'none';

			// Focus the container initially
			containerRef.current.focus();

			// Listen for clicks to refocus container
			containerRef.current.addEventListener('click', () => {
				containerRef.current.focus();
			});

			// Optional: also focus when clicking the canvas
			canvas.addEventListener('click', () => {
				containerRef.current.focus();
			});

			// Add a global debug log for keydown to confirm events fire
			const debugKeydown = (e) => {
				console.log('GLOBAL KEYDOWN:', e.code, 'Active element:', document.activeElement);
			};
			window.addEventListener('keydown', debugKeydown);

			// Clean up listeners on unmount
			return () => {
				window.removeEventListener('keydown', debugKeydown);

				if (containerRef.current && containerRef.current.contains(canvas)) {
					containerRef.current.removeChild(canvas);
				}

				// game.cleanup();
			};
		}
	}, []);

	// Listen to game state updates
	useEffect(() => {
		const unsubscribe = game.subscribe((gameState) => {
			setPlayerMPH(gameState.playerMPH);
			setOpponentMPH(gameState.opponentMPH);
			setCountdown(gameState.countdown);
		});

		const removeCountdownListener = GameState.on('countdown', (data) => {
			setCountdown(data.timer);
		});

		return () => {
			unsubscribe();
			removeCountdownListener();
		};
	}, []);

	return (
		<>
			<div className='game-container'>
				<div
					ref={containerRef}
					className='canvas-container'
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						width: '100vw',
						height: '100vh',
						zIndex: 0,
						outline: 'none',
					}}></div>
			</div>
			<UILayout />
		</>
	);
}

export default App;
