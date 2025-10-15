import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { useCylinder } from "@react-three/cannon";

export default function Coin({ onResult, color = "gold" }) {
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    position: [0, 1, 0],
    args: [1, 1, 0.15, 32],
    angularDamping: 0.05,
    linearDamping: 0.05,
  }));
  // Example pseudo-code for cannon.js / useCylinder
  // const [ref, api] = useCylinder(() => ({
  //   args: [1, 1, 0.15, 32],
  //   mass: 1,
  //   fixedRotation: false,
  //   collisionFilterGroup: 1,
  //   collisionFilterMask: 1,
  //   // Optional: only allow top/bottom collisions
  // }));

  const [headsTex, tailsTex, headsAltTex] = useLoader(THREE.TextureLoader, [
    "/textures/heads/smiley.jpeg",
    "/textures/tails/curl_tail.jpeg",
    "/textures/heads/real-head1.jpeg"
  ]);

  const velocityRef = useRef([0, 0, 0]);
  const angularVelocityRef = useRef([0, 0, 0]);
  const rotationRef = useRef([0, 0, 0]);
  const positionRef = useRef([0, 0, 0]);
  // 1️⃣ Create and preload the audio once
  const coinSound = useRef(null);

  const isFlipping = useRef(false);
  const isLocked = useRef(false);
  const airStart = useRef(0);

  // Better quality & orientation
  for (let tex of [headsTex, tailsTex, headsAltTex]) {
    tex.anisotropy = 16;
    tex.flipY = true;
    tex.colorSpace = THREE.NoColorSpace;  // << this line
  }

  useEffect(() => {
    const audio = new Audio("/sounds/coin-flip-short.mp3");
    audio.load(); // preload into memory
    coinSound.current = audio;
  }, []);

  // Subscribe to physics state
  useEffect(() => {
    const unsubV = api.velocity.subscribe((v) => (velocityRef.current = v));
    const unsubA = api.angularVelocity.subscribe(
      (v) => (angularVelocityRef.current = v)
    );
    const unsubR = api.rotation.subscribe((r) => (rotationRef.current = r));
    const unsubP = api.position.subscribe((p) => (positionRef.current = p));

    // api.rotation.set(0, -3, 0);

    return () => {
      unsubV();
      unsubA();
      unsubR();
      unsubP();
    };
  }, [api]);

  // --- Flip handler
  useEffect(() => {
    const flipHandler = () => {
      if (isLocked.current || isFlipping.current) return;
      // 🟢 Play sound right at the event (this is a user interaction)
      if (coinSound.current) {
        coinSound.current.currentTime = 0;
        coinSound.current.play().catch(err => {
          console.warn("Audio play blocked:", err);
        });
      }

      isFlipping.current = true;
      isLocked.current = true;
      airStart.current = performance.now();
      document.dispatchEvent(new CustomEvent("coin-locked", { detail: true }));

      api.position.set(0, 1, 0);

      const vy = 8 + Math.random() * 2;
      const ax = 15 + Math.random() * 5;
      const ay = Math.random() * 2;
      const az = 5 + Math.random() * 5;

      requestAnimationFrame(() => {
        api.velocity.set(0, vy, 0);
        api.angularVelocity.set(ax, ay, az);
        api.wakeUp();
      });
    };

    document.addEventListener("flip-coin", flipHandler);
    return () => document.removeEventListener("flip-coin", flipHandler);
  }, [api]);

  // --- Detect landing
  useFrame(() => {
    if (!ref.current) return;

    const [vx, vy, vz] = velocityRef.current;
    const [ax, ay, az] = angularVelocityRef.current;
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const spin = Math.sqrt(ax * ax + ay * ay + az * az);
    const timeSinceFlip = (performance.now() - airStart.current) / 1000;

    if (isFlipping.current && timeSinceFlip > 0.6 && speed < 0.05 && spin < 0.05) {
      isFlipping.current = false;

      const [rx, ry, rz] = rotationRef.current;
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rx, ry, rz)
      );

      const topNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
      const bottomNormal = new THREE.Vector3(0, -1, 0).applyQuaternion(quat);

      if (Math.abs(topNormal.y) < 0.5) {
        // coin is almost on its side
        // rotate it onto closest face
        api.rotation.set(rx, ry, rz + Math.PI / 2);
      }

      const face = topNormal.y > bottomNormal.y ? "Heads" : "Tails";

      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);

      onResult(face);

      doResetMotion(api, positionRef, () => {
        isLocked.current = false;
        document.dispatchEvent(new CustomEvent("coin-locked", { detail: false }));
      });
    }
  });

  // --- Auto-center safeguard
  useFrame(() => {
    const [x, y, z] = positionRef.current;
    const driftThreshold = 0.05;
    const maxRadius = 7.0;

    const isIdle = !isFlipping.current && !isLocked.current;

    if (isIdle) {
      const distance = Math.sqrt(x * x + z * z);
      if (distance > maxRadius) {
        const scale = maxRadius / distance;
        api.position.set(x * scale, y, z * scale);
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
      } else if (Math.abs(x) > driftThreshold || Math.abs(z) > driftThreshold) {
        autoCenterCoin(api, positionRef);
      }
    }
  });

  return (
    <group ref={ref}>
      {/* Base coin cylinder (gold, always visible) */}
      <mesh castShadow>
        <cylinderGeometry args={[1, 1, 0.15, 64, 1, false]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Heads overlay */}
      <mesh position={[0, 0.076, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color={color}       // gold base
          bumpMap={headsAltTex}  // etch icon
          bumpScale={-2}           // for testing only, will look crazy strong
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>

      {/* Tails overlay */}
      <mesh position={[0, -0.076, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color={color}       // gold base
          bumpMap={tailsTex}  // etch icon
          bumpScale={-1}           // for testing only, will look crazy strong
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

// --- Smooth reset with anti-drift
function doResetMotion(api, positionRef, onDone) {
  const [x, y, z] = positionRef.current;
  const start = new THREE.Vector3(x, y, z);
  const target = new THREE.Vector3(0, 1, 0);
  let t = 0;

  // Temporarily disable physics integration
  try {
    if (api.mass && typeof api.mass.set === "function") api.mass.set(0);
  } catch (e) {
    console.warn("mass.set not available, fallback to damping approach");
  }

  // Trigger background pulse after reset
  document.dispatchEvent(new CustomEvent("coin-reset"));

  const step = () => {
    t += 0.03;
    const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
    const newPos = start.clone().lerp(target, eased);
    api.position.set(newPos.x, newPos.y, newPos.z);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      try {
        if (api.mass && typeof api.mass.set === "function") api.mass.set(1);
      } catch (e) { }

      // Zero velocity repeatedly
      let clears = 0;
      const clearLoop = () => {
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        clears++;
        if (clears < 8) requestAnimationFrame(clearLoop);
        else onDone();
      };
      clearLoop();
    }
  };

  requestAnimationFrame(step);
}

// --- Auto-center function (runs if coin drifts)
function autoCenterCoin(api, positionRef) {
  const [x, y, z] = positionRef.current;
  const targetX = THREE.MathUtils.lerp(x, 0, 0.2);
  const targetZ = THREE.MathUtils.lerp(z, 0, 0.2);
  api.position.set(targetX, y, targetZ);
  api.velocity.set(0, 0, 0);
  api.angularVelocity.set(0, 0, 0);
}
