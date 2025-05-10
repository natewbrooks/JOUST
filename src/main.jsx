import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './global.css';
import App from './App.jsx';

// We're using React only for UI rendering
// The game logic runs independently of React
createRoot(document.getElementById('root')).render(
	<StrictMode>
		<App />
	</StrictMode>
);
