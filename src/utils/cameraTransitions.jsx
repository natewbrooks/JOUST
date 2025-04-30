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

export const setPovCamera = (camera, isInit, anchor) => {
	if (!camera || !anchor) return;

	// Add camera to anchor
	anchor.add(camera);

	// Local offset from anchor (head bone)
	const offsetPos = new THREE.Vector3(0, 0.5, 0.25); // Above and slightly behind
	const offsetRot = new THREE.Euler(0, Math.PI, 0); // Flip 180° on Y

	if (isInit) {
		gsap.to(camera.position, {
			x: offsetPos.x,
			y: offsetPos.y,
			z: offsetPos.z,
			duration: 1,
			ease: 'power2.inOut',
		});
	} else {
		camera.position.copy(offsetPos);
		isInit = true;
	}

	// Apply rotational offset
	camera.rotation.copy(offsetRot);

	// Mouse pans the anchor/head
	setupMousePanning(anchor);
};

// Mouse control state
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

const panSensitivity = 0.002; // Optional, but currently unused
const maxPanAngleX = 0.8; // Horizontal (left/right) max in radians (~17°)
const maxPanAngleY = 0.3; // Vertical (up/down) max in radians (~8.5°)

function setupMousePanning(anchor) {
	// Clean up any existing listeners
	window.removeEventListener('mousemove', onMouseMove);

	// Add new listener
	window.addEventListener('mousemove', onMouseMove);

	// Avoid multiple animation loops
	if (!window.cameraPanningActive) {
		window.cameraPanningActive = true;
		animateCameraPanning(anchor);
	}
}

function onMouseMove(event) {
	mouseX = (event.clientX / window.innerWidth) * 2 - 1;
	mouseY = -((event.clientY / window.innerHeight) * 2 - 1);
}

function animateCameraPanning(target) {
	requestAnimationFrame(() => animateCameraPanning(target));

	// Lerp to max pan angle per axis
	targetRotationX = THREE.MathUtils.lerp(targetRotationX, -mouseX * maxPanAngleX, 0.05);
	targetRotationY = THREE.MathUtils.lerp(targetRotationY, -mouseY * maxPanAngleY, 0.05);

	target.rotation.y = targetRotationX; // left/right (yaw)
	target.rotation.x = targetRotationY; // up/down (pitch)
}

// Optional: Clean up event listeners when no longer needed
export const cleanupPovCamera = () => {
	window.removeEventListener('mousemove', onMouseMove);
	window.cameraPanningActive = false;
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
