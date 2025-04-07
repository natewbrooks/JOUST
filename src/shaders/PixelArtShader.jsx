// PixelArtShader.js
import * as THREE from 'three';

export const PixelArtShader = {
	uniforms: {
		tDiffuse: { value: null },
		resolution: { value: new THREE.Vector2(1.0, 1.0) },
		pixelSize: { value: 4.0 },
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
			vec2 pixelatedCoord = (floor(fragCoord / pixelSize) + 0.5) * pixelSize;
			vec2 uv = pixelatedCoord / resolution;

			vec4 color = texture2D(tDiffuse, uv);
			color.rgb = pow(color.rgb, vec3(1.0 / 2.2)); // Linear to sRGB correction
			gl_FragColor = color;
		}
	`,
};
