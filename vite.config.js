import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
	// Use '/' for development and '/JOUST/' for production
	const base = command === 'serve' ? '/' : '/JOUST/';
	return {
		plugins: [react(), tailwindcss()],
		base: base,
	};
});
