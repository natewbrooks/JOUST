import * as THREE from 'three';

export const PixelArtShader = {
	uniforms: {
		tDiffuse: { value: null },
		resolution: { value: new THREE.Vector2(1.0, 1.0) },
		pixelSize: { value: 3.0 },
	},
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform vec2 resolution;
		uniform float pixelSize;
		varying vec2 vUv;
		void main() {
			vec2 fragCoord = vUv * resolution;
			vec2 pixelatedCoord = floor(fragCoord / pixelSize) * pixelSize;
			vec2 uv = pixelatedCoord / resolution;
			gl_FragColor = texture2D(tDiffuse, uv);
		}
	`,
};
