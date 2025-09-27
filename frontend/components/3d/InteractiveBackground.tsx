'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Custom shader material for advanced visual effects
const WaveShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_mouse: new THREE.Vector2(),
    u_resolution: new THREE.Vector2(),
    u_color1: new THREE.Color('#3b82f6'),
    u_color2: new THREE.Color('#a855f7'),
    u_color3: new THREE.Color('#06b6d4'),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform vec2 u_resolution;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Noise function
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec2 uv = vUv;
      vec2 mouse = u_mouse / u_resolution;
      
      // Create flowing patterns
      float time = u_time * 0.5;
      vec2 flow = vec2(
        fbm(uv * 3.0 + time * 0.1),
        fbm(uv * 3.0 + time * 0.15 + 100.0)
      );
      
      // Mouse interaction
      float mouseInfluence = smoothstep(0.8, 0.0, distance(uv, mouse)) * 0.5;
      flow += mouseInfluence;
      
      // Create color mixing
      float pattern1 = sin(flow.x * 10.0 + time) * 0.5 + 0.5;
      float pattern2 = cos(flow.y * 8.0 + time * 1.2) * 0.5 + 0.5;
      float pattern3 = sin((flow.x + flow.y) * 6.0 + time * 0.8) * 0.5 + 0.5;
      
      vec3 color = mix(u_color1, u_color2, pattern1);
      color = mix(color, u_color3, pattern2 * pattern3);
      
      // Add some glow
      float glow = smoothstep(0.0, 1.0, pattern1 * pattern2);
      color += glow * 0.3;
      
      // Final opacity based on patterns
      float alpha = (pattern1 + pattern2 + pattern3) * 0.15;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
)

// TypeScript declaration for custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      waveShaderMaterial: any
    }
  }
}

extend({ WaveShaderMaterial })

// Animated mesh with gradient material
function AnimatedBackground() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.001
      const material = meshRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    }
  })
  
  return (
    <mesh ref={meshRef} scale={[6, 6, 1]} position={[0, 0, -8]}>
      <planeGeometry args={[10, 10, 50, 50]} />
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.1}
        blending={THREE.AdditiveBlending}
        wireframe
      />
    </mesh>
  )
}

// Floating geometric shapes
function GeometricShapes() {
  const groupRef = useRef<THREE.Group>(null)
  
  const shapes = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      scale: 0.2 + Math.random() * 0.8,
      speed: 0.01 + Math.random() * 0.02,
      color: new THREE.Color().setHSL(0.5 + Math.random() * 0.4, 0.7, 0.6),
      shape: ['box', 'sphere', 'octahedron', 'tetrahedron'][Math.floor(Math.random() * 4)]
    }))
  , [])
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.x += shapes[i].speed
        child.rotation.y += shapes[i].speed * 1.2
        child.position.y += Math.sin(state.clock.elapsedTime + i) * 0.005
      })
    }
  })
  
  return (
    <group ref={groupRef}>
      {shapes.map((shape, i) => (
        <mesh
          key={shape.id}
          position={shape.position}
          rotation={shape.rotation}
          scale={shape.scale}
        >
          {shape.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
          {shape.shape === 'sphere' && <sphereGeometry args={[0.5, 16, 16]} />}
          {shape.shape === 'octahedron' && <octahedronGeometry args={[0.6]} />}
          {shape.shape === 'tetrahedron' && <tetrahedronGeometry args={[0.7]} />}
          <meshPhysicalMaterial
            color={shape.color}
            transparent
            opacity={0.4}
            roughness={0.1}
            metalness={0.8}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

// Grid effect for cyber aesthetic
function CyberGrid() {
  const gridRef = useRef<THREE.LineSegments>(null)
  
  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const size = 100
    const divisions = 50
    
    // Create grid lines
    for (let i = 0; i <= divisions; i++) {
      const step = size / divisions
      const pos = -size / 2 + i * step
      
      // Horizontal lines
      vertices.push(-size / 2, pos, 0, size / 2, pos, 0)
      // Vertical lines  
      vertices.push(pos, -size / 2, 0, pos, size / 2, 0)
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }, [])
  
  useFrame((state) => {
    if (gridRef.current && gridRef.current.material) {
      const material = gridRef.current.material as THREE.LineBasicMaterial
      material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    }
  })
  
  return (
    <lineSegments ref={gridRef} geometry={gridGeometry} position={[0, 0, -10]}>
      <lineBasicMaterial 
        color="#3b82f6" 
        transparent 
        opacity={0.1}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}

// Main interactive background component
export default function InteractiveBackground() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) return null
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance" 
        }}
        dpr={[1, 2]}
      >
        <AnimatedBackground />
        <GeometricShapes />
        <CyberGrid />
        
        {/* Subtle ambient lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.3} color="#60a5fa" />
      </Canvas>
      
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-base-950/20 via-transparent to-base-950/20 pointer-events-none" />
    </div>
  )
}