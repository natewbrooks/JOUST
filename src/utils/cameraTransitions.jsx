import gsap from 'gsap';

/**
 * Smoothly moves one camera to another camera's transform
 * @param {THREE.Camera} fromCamera - The current active camera
 * @param {THREE.Camera} toCamera - The target camera (final position)
 * @param {function} onComplete - Optional callback
 */
export const transitionToCamera = (
	mainCamera,
	targetCamera,
	{ duration = 1.5, ease = 'power2.inOut' } = {}
) => {
	gsap.to(mainCamera.position, {
		x: targetCamera.position.x,
		y: targetCamera.position.y,
		z: targetCamera.position.z,
		duration,
		ease,
	});

	gsap.to(mainCamera.rotation, {
		x: targetCamera.rotation.x,
		y: targetCamera.rotation.y,
		z: targetCamera.rotation.z,
		duration,
		ease,
	});
};

/**
 * Animates the camera to a "hit" position and then rotates 90° from side view,
 * moving in closer toward the model
 * @param {THREE.Camera} camera - The camera to move
 */
export const toggleHitView = (camera, lookAt) => {
	if (!camera) return;

	const targetPosition = { x: 10.5, y: 2.5, z: 1.3 };
	const targetRotation = { x: 0, y: Math.PI / 2, z: 0 };
	gsap.to(camera.rotation, {
		...targetRotation,
		duration: 1.5,
		ease: 'power2.inOut',
	});

	gsap.to(camera.position, {
		...targetPosition,
		duration: 1,
		ease: 'power2.inOut',
	});
};

/**
 * Animates the camera to a "side" position and then rotates to face the mesh
 * @param {THREE.Camera} camera - The camera to move
 */
export const toggleSideView = (camera) => {
	if (!camera) return;

	const targetPosition = { x: 0, y: 6, z: 10 };
	const targetRotation = { x: -0.35, y: 0, z: 0 }; // ← look toward -X (side view)

	// Animate position
	gsap.to(camera.position, {
		...targetPosition,
		duration: 3,
		ease: 'power2.inOut',
	});

	// Animate rotation
	gsap.to(camera.rotation, {
		...targetRotation,
		duration: 2,
		ease: 'power2.inOut',
	});
};
