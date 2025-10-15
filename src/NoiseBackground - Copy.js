// src/NoiseBackground.js
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function NoiseBackground() {
    const materialRef = useRef();
    const glowRef = useRef(0); // target glow intensity

    // Random seed so each app start looks unique
    const seed = useMemo(() => Math.random() * 1000, []);

    // Animate over time
    useFrame(({ clock }) => {
        if (!materialRef.current) return;
        const mat = materialRef.current;
        mat.uniforms.uTime.value = clock.getElapsedTime();

        // Smoothly decay glow toward 0
        glowRef.current = Math.max(0, glowRef.current - 0.015);
        mat.uniforms.uGlow.value = glowRef.current;
    });

    // Listen for game events
    useEffect(() => {
        const onFlip = () => {
            glowRef.current = 1.0; // full glow on flip
        };
        const onReset = () => {
            // optionally soften the glow on landing
            glowRef.current = 0.3;
            setTimeout(() => (glowRef.current = 0), 800);
        };
        document.addEventListener("flip-coin", onFlip);
        document.addEventListener("coin-reset", onReset);
        return () => {
            document.removeEventListener("flip-coin", onFlip);
            document.removeEventListener("coin-reset", onReset);
        };
    }, []);

    return (
        <mesh scale={[50, 50, 1]} position={[0, 0, -10]}>
            <planeGeometry args={[1, 1, 1]} />
            <shaderMaterial
                ref={materialRef}
                uniforms={{
                    uTime: { value: 0 },
                    uSeed: { value: seed },
                    uGlow: { value: 0 },
                }}
                vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
                fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform float uSeed;
          uniform float uGlow;

          // --- hash / noise helpers
          float hash(vec2 p) {
            p += uSeed;
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) +
                   (c - a) * u.y * (1.0 - u.x) +
                   (d - b) * u.x * u.y;
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float amp = 0.5;
            for (int i = 0; i < 5; i++) {
              v += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
            }
            return v;
          }

          void main() {
            vec2 uv = vUv * 3.0 + vec2(uTime * 0.05, sin(uTime * 0.2) * 0.1);
            float n = fbm(uv);

            // Base color palette
            vec3 c1 = vec3(0.07, 0.05, 0.15);
            vec3 c2 = vec3(0.3, 0.15, 0.45);
            vec3 c3 = vec3(0.9, 0.7, 0.5);
            vec3 color = mix(c1, c2, smoothstep(0.3, 0.6, n));
            color = mix(color, c3, smoothstep(0.7, 1.0, n));

            // Outline: use gradient magnitude
            float e = 0.001;
            float nx = fbm(uv + vec2(e, 0.0)) - fbm(uv - vec2(e, 0.0));
            float ny = fbm(uv + vec2(0.0, e)) - fbm(uv - vec2(0.0, e));
            float edge = length(vec2(nx, ny));
            edge = smoothstep(0.1, 0.25, edge);

            // Normal dark outline
            vec3 outlineColor = mix(color, vec3(0.0), edge * 0.6);

            // Glow overlay — brightens outlines based on uGlow
            float glow = uGlow * edge;
            vec3 glowColor = mix(outlineColor, vec3(1.0, 0.9, 0.6), glow);

            // Combine final color
            vec3 finalColor = mix(outlineColor, glowColor, uGlow);

            // Subtle vignette for focus
            float d = distance(vUv, vec2(0.5));
            float vignette = smoothstep(0.85, 0.35, d);
            finalColor *= vignette;

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}
