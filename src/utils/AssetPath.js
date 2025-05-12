// utils/assetPath.js
export const getAssetPath = (path) => {
	// Remove leading slash if present
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;

	// In development, use root path; in production, use the configured base
	const base = import.meta.env.DEV ? '/' : import.meta.env.BASE_URL;

	return `${base}${cleanPath}`;
};
