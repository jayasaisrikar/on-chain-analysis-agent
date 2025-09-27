'use client'

import React, { useMemo, useRef, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sphere, MeshDistortMaterial, Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Floating crypto symbols component
function CryptoSymbols() {
  const symbolsRef = useRef<THREE.Group>(null)
  
  const symbols = useMemo(() => {
    const cryptoIcons = ['₿', '♦', '◊', '●', '◎', '◉', '⬟', '⬢']
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      symbol: cryptoIcons[Math.floor(Math.random() * cryptoIcons.length)],
      position: [
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 50
      ] as [number, number, number],
      scale: 0.5 + Math.random() * 1.5,
      speed: 0.5 + Math.random() * 2,
    }))
  }, [])

  useFrame((state) => {
    if (symbolsRef.current) {
      symbolsRef.current.rotation.y += 0.001
      symbolsRef.current.children.forEach((child, i) => {
        child.position.y += Math.sin(state.clock.elapsedTime * symbols[i].speed) * 0.01
        child.rotation.z += 0.005
      })
    }
  })

  return (
    <group ref={symbolsRef}>
      {symbols.map((item, i) => (
        <Float
          key={item.id}
          speed={item.speed}
          rotationIntensity={0.2}
          floatIntensity={0.5}
        >
          <mesh position={item.position} scale={item.scale}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial 
              transparent 
              opacity={0.1} 
              color={new THREE.Color().setHSL(0.6 + Math.random() * 0.4, 0.8, 0.7)}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

// Interactive particle field
function ParticleField() {
  const meshRef = useRef<THREE.Points>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  
  const { viewport, mouse } = useThree()
  
  const particlesGeometry = useMemo(() => {
    const particles = new Float32Array(2000 * 3)
    const colors = new Float32Array(2000 * 3)
    
    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3
      // Position
      particles[i3] = (Math.random() - 0.5) * 100
      particles[i3 + 1] = (Math.random() - 0.5) * 100  
      particles[i3 + 2] = (Math.random() - 0.5) * 100
      
      // Colors - crypto-themed gradient
      const hue = 0.6 + Math.random() * 0.4 // Blue to purple range
      const color = new THREE.Color().setHSL(hue, 0.8, 0.7)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position
      
      // Mouse interaction effect
      mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, mouse.x * viewport.width, 0.1)
      mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, mouse.y * viewport.height, 0.1)
      
      // Animate particles
      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3
        const x = positions.array[i3]
        const y = positions.array[i3 + 1]
        
        // Distance from mouse influence
        const distance = Math.sqrt((x - mouseRef.current.x) ** 2 + (y - mouseRef.current.y) ** 2)
        const force = Math.max(0, 1 - distance / 20)
        
        positions.array[i3] += Math.sin(state.clock.elapsedTime + i * 0.01) * 0.01 + force * 0.1
        positions.array[i3 + 1] += Math.cos(state.clock.elapsedTime + i * 0.01) * 0.01 + force * 0.1
        positions.array[i3 + 2] += Math.sin(state.clock.elapsedTime * 0.5 + i * 0.02) * 0.005
      }
      
      positions.needsUpdate = true
      
      // Rotate the entire system slowly
      meshRef.current.rotation.y += 0.0005
    }
  })

  return (
    <points ref={meshRef} geometry={particlesGeometry}>
      <pointsMaterial 
        size={0.8} 
        transparent 
        opacity={0.6}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Animated distortion sphere
function DistortionSphere() {
  const sphereRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = state.clock.elapsedTime * 0.1
      sphereRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
      <Sphere ref={sphereRef} args={[8, 64, 64]} position={[0, 0, -20]}>
        <MeshDistortMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
          distort={0.4}
          speed={2}
          roughness={0}
        />
      </Sphere>
    </Float>
  )
}

// Main component
export default function CryptoBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ 
          position: [0, 0, 20], 
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#60a5fa" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
        
        {/* Environment for reflections */}
        <Environment preset="city" />
        
        {/* Interactive elements */}
        <ParticleField />
        <DistortionSphere />
        <CryptoSymbols />
        
        {/* Camera controls - subtle movement only */}
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>
      
      {/* Gradient overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-base-950/60 pointer-events-none" />
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none bg-noise" />
    </div>
  )
}