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
export const setPovCamera = (
	camera,
	targetPosition,
	lookAtPosition,
	isInit,
	player,
	horsesPassed
) => {
	if (!camera) return;

	const offset = new THREE.Vector3(0, 0, 0); // Not used right now but kept for future customization

	// If the horses have passed, don't look at the opponent anymore
	if (horsesPassed) {
		camera.position.copy(player.position); // Snap to player position

		// Get the forward direction from the player
		const forward = new THREE.Vector3();
		player.getWorldDirection(forward);
		forward.normalize();

		// Determine the final target the camera should look at
		const lookTarget = player.position.clone().add(forward);

		// Get current camera look direction (as a point in space)
		const currentLookAt = new THREE.Vector3();
		camera.getWorldDirection(currentLookAt).add(camera.position);

		// Animate the lookAt direction
		const dummy = { t: 0 };
		gsap.to(dummy, {
			t: 1,
			duration: 1.5,
			ease: 'power2.out',
			onUpdate: () => {
				const interpolated = currentLookAt.clone().lerp(lookTarget, dummy.t);
				camera.lookAt(interpolated);
			},
			onComplete: () => {
				camera.lookAt(lookTarget);
			},
		});

		return;
	}

	// If initialized, tween to target and track opponent
	if (isInit) {
		gsap.to(camera.position, {
			...targetPosition,
			duration: 1,
			ease: 'power2.inOut',
			onUpdate: () => {
				camera.lookAt(lookAtPosition);
			},
			onComplete: () => {
				camera.lookAt(lookAtPosition); // final snap
			},
		});
	} else {
		// First-time setup
		camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
		camera.lookAt(lookAtPosition);
		isInit = true; // this won't persist — see below
	}
};

/**
 * Sets the camera to a "side" position with adjustable distance
 * @param {THREE.Camera} camera - The camera to move
 * @param {Object} options - Camera positioning options
 * @param {number} [options.distance=15] - Distance from center (z-position)
 * @param {number} [options.height=2] - Height of camera (y-position)
 * @param {number} [options.zoom=150] - Zoom factor (higher = more zoomed in)
 * @param {boolean} [options.animate=false] - Whether to animate the camera movement
 */
export const setSideViewCamera = (camera, options = {}) => {
	if (!camera) return;

	const {
		distance = 15,
		height = 2,
		zoom = 150,
		animate = false,
		duration = 1.5,
		ease = 'power2.inOut',
	} = options;

	const targetPosition = { x: 0, y: height, z: distance };
	const targetRotation = { x: 0, y: 0, z: 0 };

	// Store zoom factor on camera for handleResize to use
	camera.userData.zoomFactor = zoom;

	if (animate && camera.position) {
		// Animate camera movement if requested
		gsap.to(camera.position, {
			x: targetPosition.x,
			y: targetPosition.y,
			z: targetPosition.z,
			duration,
			ease,
		});

		gsap.to(camera.rotation, {
			x: targetRotation.x,
			y: targetRotation.y,
			z: targetRotation.z,
			duration,
			ease,
		});

		// If it's an orthographic camera, also animate the frustum
		if (camera.isOrthographicCamera) {
			const w = window.innerWidth;
			const h = window.innerHeight;
			const bottomHeight = h * 0.3 - 2; // Match the calculation in handleResize

			gsap.to(camera, {
				left: -w / zoom,
				right: w / zoom,
				top: bottomHeight / zoom,
				bottom: -bottomHeight / zoom,
				duration,
				ease,
				onUpdate: () => camera.updateProjectionMatrix(),
			});
		}
	} else {
		// Set camera position and rotation immediately
		camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
		camera.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);

		// If it's an orthographic camera, update frustum size
		if (camera.isOrthographicCamera) {
			const w = window.innerWidth;
			const h = window.innerHeight;
			const bottomHeight = h * 0.3 - 2; // Match the calculation in handleResize

			camera.left = -w / zoom;
			camera.right = w / zoom;
			camera.top = bottomHeight / zoom;
			camera.bottom = -bottomHeight / zoom;
			camera.updateProjectionMatrix();
		}
	}
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
