import gsap from 'gsap';
import * as THREE from 'three';

/**
 * Smoothly transitions the main camera to the position and rotation of a target camera.
 *
 * @param {THREE.Camera} mainCamera - The camera being animated (active camera).
 * @param {THREE.Camera} targetCamera - The destination camera to match.
 * @param {Object} options - GSAP animation options.
 * @param {number} [options.duration=1.5] - Duration of the transition.
 * @param {string} [options.ease='power2.inOut'] - Easing function.
 * @param {Function} [onComplete] - Optional callback after transition.
 */
export const swapCameraView = (
	mainCamera,
	targetCamera,
	{ duration = 1.5, ease = 'power2.inOut' } = {},
	onComplete
) => {
	if (!mainCamera || !targetCamera) return;

	console.log('MAIN CAMERA START POS:', mainCamera.position.toArray());
	console.log('TARGET CAMERA POS:', targetCamera.position.toArray());

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
		onComplete,
	});
};

/**
 * Sets the camera to the target (players) position and looks at object (opponent)
 * @param {THREE.Camera} camera - The camera to move
 */
export const setPovCamera = (camera, targetPosition, lookAtPosition, isInit) => {
	if (!camera) return;

	const offset = new THREE.Vector3(0, 0, 0);

	// If the camera is already initalized, do transition
	if (isInit) {
		gsap.to(camera.position, {
			...targetPosition,
			duration: 1,
			ease: 'power2.inOut',
			onUpdate: () => {
				camera.lookAt(lookAtPosition);
			},
			onComplete: () => {
				camera.lookAt(lookAtPosition); // ensure it's final
			},
		});
	} else {
		camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
		camera.lookAt(lookAtPosition);
		isInit = true;
	}
};

/**
 * Sets the camera to a "side" position
 * @param {THREE.Camera} camera - The camera to move
 */
export const setSideViewCamera = (camera) => {
	if (!camera) return;

	const targetPosition = { x: 0, y: 1.5, z: 10 };
	const targetRotation = { x: 0, y: 0, z: 0 }; // ← fixed: z: 10 would twist view oddly

	camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
	camera.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);
};

/**
 * Gets the forward-facing plane of the camera from the cameras point of view
 * @param {THREE.Camera} camera - The camera to move
 */
export const getCameraForwardPlane = (camera, distance = 10) => {
	if (!camera) return;

	// Get the camera's world direction (normalized forward vector)
	const direction = new THREE.Vector3();
	camera.getWorldDirection(direction); // camera looks along -Z in local space

	// Set the plane's normal to match the camera's forward direction
	const planeNormal = direction.clone();

	// Set the plane's position `distance` units in front of the camera
	const planePoint = camera.position.clone().add(direction.multiplyScalar(distance));

	//Create the plane: normal + point on plane
	const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
	return plane;
};
