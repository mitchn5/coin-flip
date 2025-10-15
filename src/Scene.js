import { useState } from "react";
import { usePlane } from "@react-three/cannon";
import { useLoader } from "@react-three/fiber";
import { TextureLoader, RepeatWrapping } from 'three';
import Coin from "./Coin";

function Ground() {
    const [ref] = usePlane(() => ({
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0, 0],
    }));

    const [colorMap, normalMap, roughnessMap, aoMap] = useLoader(TextureLoader, [
        '/textures/ground/Wood_Color.png',
        '/textures/ground/Wood_Normal.png',
        '/textures/ground/Wood_Roughness.png',
        '/textures/ground/Wood_Displacement.png',
    ]);

    // Set wrapping and repeat
    for (let map of [colorMap, normalMap, roughnessMap, aoMap]) {
        map.wrapS = map.wrapT = RepeatWrapping
        map.repeat.set(1, 1)
        map.anisotropy = 16
        map.flipY = false
    }

    return (
        <group>
            <mesh receiveShadow rotation-x={-Math.PI / 2}>
                <circleGeometry args={[7.5, 64]} />
                <meshStandardMaterial
                    map={colorMap}
                    normalMap={normalMap}
                    roughnessMap={roughnessMap}
                    aoMap={aoMap}
                    roughness={1} // overall roughness multiplier
                    metalness={0.1} // slight reflection for realism
                />
            </mesh>
        </group>
    )
}



export default function Scene({ onResult, coinColor, headsType, tailsType, soundEnabled }) {

    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[5, 10, 5]}
                castShadow
                intensity={2}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <Ground />
            <Coin
                onResult={onResult}
                color={coinColor}
                headsType={headsType}
                tailsType={tailsType}
                soundEnabled={soundEnabled}
            />
        </>
    );
}
