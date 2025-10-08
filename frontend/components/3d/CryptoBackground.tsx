'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface HyperspeedOptions {
  length: number
  roadWidth: number
  islandWidth: number
  lanesPerRoad: number
  fov: number
  fovSpeedUp: number
  speedUp: number
  carLightsFade: number
  totalSideLightSticks: number
  lightPairsPerRoadWay: number
  carLightsLength: [number, number]
  carLightsRadius: [number, number]
  carWidthPercentage: [number, number]
  carShiftX: [number, number]
  carFloorSeparation: [number, number]
  movingAwaySpeed: [number, number]
  movingCloserSpeed: [number, number]
  colors: {
    roadColor: number
    islandColor: number
    background: number
    shoulderLines: number
    brokenLines: number
    leftCars: number[]
    rightCars: number[]
    sticks: number
  }
}

const defaultOptions: HyperspeedOptions = {
  length: 400,
  roadWidth: 9,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2.5,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 80,
  carLightsLength: [20, 80],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.2, 0.2],
  carFloorSeparation: [0, 0.15],
  movingAwaySpeed: [60, 100],
  movingCloserSpeed: [-120, -200],
  colors: {
    roadColor: 0x0a0a0a,
    islandColor: 0x0f0f0f,
    background: 0x000000,
    shoulderLines: 0x222222,
    brokenLines: 0x222222,
    leftCars: [0xff006e, 0xff0080, 0xff1744, 0xe91e63],
    rightCars: [0x00d9ff, 0x00e4ff, 0x06b6d4, 0x0ea5e9],
    sticks: 0x06b6d4
  }
}

const random = (base: number | [number, number]) =>
  Array.isArray(base) ? Math.random() * (base[1] - base[0]) + base[0] : Math.random() * base

const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

const lerp = (a: number, b: number, t = 0.1) => a + (b - a) * t

class HyperspeedApp {
  container: HTMLElement
  options: HyperspeedOptions
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  clock: THREE.Clock
  disposed = false
  fovTarget: number
  speedUpTarget = 0
  speedUp = 0
  timeOffset = 0
  animationId: number | null = null
  leftLights = new THREE.Group()
  rightLights = new THREE.Group()
  leftSticks = new THREE.Group()
  rightSticks = new THREE.Group()
  mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
  cameraShake = 0
  scrollY = 0
  scrollTarget = 0

  constructor(container: HTMLElement, options: HyperspeedOptions) {
    this.container = container
    this.options = options
    this.fovTarget = options.fov

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(container.offsetWidth, container.offsetHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      options.fov,
      container.offsetWidth / container.offsetHeight,
      0.1,
      10000
    )
    this.camera.position.set(0, 8, -5)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(options.colors.background)
    this.scene.fog = new THREE.FogExp2(options.colors.background, 0.005)

    this.clock = new THREE.Clock()

    this.createRoad()
    this.createCarLights()
    this.createSideSticks()
    this.createParticles()
    this.setupEventListeners()
    this.tick()
  }

  setScroll(value: number) {
    this.scrollTarget = value
  }

  private addPlane(w: number, h: number, color: number, x = 0) {
    const geo = new THREE.PlaneGeometry(w, h, 40, 400)
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, 0, -this.options.length / 2)
    this.scene.add(mesh)
    return mesh
  }

  private createRoad() {
    const { roadWidth, islandWidth, colors, lanesPerRoad } = this.options
    this.addPlane(roadWidth, this.options.length, colors.roadColor, -(roadWidth / 2 + islandWidth / 2))
    this.addPlane(roadWidth, this.options.length, colors.roadColor, roadWidth / 2 + islandWidth / 2)
    this.addPlane(islandWidth, this.options.length, colors.islandColor)
  }

  private createCarLights() {
    const { lanesPerRoad, roadWidth, islandWidth, carLightsRadius, carLightsLength, carShiftX, carFloorSeparation } = this.options
    const laneWidth = roadWidth / lanesPerRoad

    const makeLights = (count: number, colorSet: number[], speedRange: [number, number], side: 'left' | 'right') => {
      for (let i = 0; i < count; i++) {
        const radius = random(carLightsRadius)
        const length = random(carLightsLength)
        const speed = random(speedRange)
        const lane = Math.floor(Math.random() * lanesPerRoad)
        let laneX = lane * laneWidth - roadWidth / 2 + laneWidth / 2 + random(carShiftX) * laneWidth
        const offsetY = random(carFloorSeparation) + radius * 2
        const startZ = -random(this.options.length)
        const color = new THREE.Color(pickRandom(colorSet))
        for (let j = 0; j < 2; j++) {
          const xOffset = j === 0 ? -0.25 : 0.25
          const geo = new THREE.CylinderGeometry(radius, radius * 0.5, length, 8)
          const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: side === 'left' ? 0.9 : 1 })
          const light = new THREE.Mesh(geo, mat)
          light.rotation.x = Math.PI / 2
          light.position.set(
            (side === 'left' ? -(roadWidth / 2 + islandWidth / 2) : roadWidth / 2 + islandWidth / 2) + laneX + xOffset,
            offsetY,
            startZ
          )
          const point = new THREE.PointLight(color, side === 'left' ? 0.5 : 0.8, side === 'left' ? 3 : 4)
          point.position.copy(light.position)
          ;(light as any).speed = speed
          ;(light as any).startZ = startZ
          ;(light as any).pointLight = point
          ;(light as any).parallaxFactor = side === 'left' ? 0.3 : 0.5
          ;(side === 'left' ? this.leftLights : this.rightLights).add(light)
          this.scene.add(point)
        }
      }
    }

    makeLights(this.options.lightPairsPerRoadWay, this.options.colors.leftCars, this.options.movingAwaySpeed, 'left')
    makeLights(this.options.lightPairsPerRoadWay, this.options.colors.rightCars, this.options.movingCloserSpeed, 'right')

    this.scene.add(this.leftLights, this.rightLights)
  }

  private createSideSticks() {
    const { totalSideLightSticks, length, roadWidth, islandWidth, colors } = this.options
    const stickW = 0.12, stickH = 1.8, spacing = length / totalSideLightSticks
    const color = new THREE.Color(colors.sticks)

    const makeSticks = (side: 'left' | 'right') => {
      for (let i = 0; i < totalSideLightSticks; i++) {
        const geo = new THREE.BoxGeometry(stickW, stickH, stickW)
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
        const stick = new THREE.Mesh(geo, mat)
        const z = -i * spacing
        stick.position.set((side === 'left' ? -(roadWidth + islandWidth / 2 + 0.6) : roadWidth + islandWidth / 2 + 0.6), stickH / 2, z)
        const topLight = new THREE.PointLight(color, 0.3, 2)
        topLight.position.set(stick.position.x, stickH, stick.position.z)
        this.scene.add(topLight)
        ;(stick as any).startZ = z
        ;(stick as any).topLight = topLight
        ;(stick as any).parallaxFactor = 0.6
        ;(side === 'left' ? this.leftSticks : this.rightSticks).add(stick)
      }
    }

    makeSticks('left')
    makeSticks('right')
    this.scene.add(this.leftSticks, this.rightSticks)
  }

  private createParticles() {
    const count = 200
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = Math.random() * 20
      pos[i * 3 + 2] = -Math.random() * this.options.length
      const c = new THREE.Color(pickRandom(Math.random() > 0.5 ? this.options.colors.leftCars : this.options.colors.rightCars))
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
    const particles = new THREE.Points(geo, mat)
    particles.userData.isParticles = true
    particles.userData.parallaxFactor = 0.8
    this.scene.add(particles)
  }

  private setupEventListeners() {
    const speedUp = () => { this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; this.cameraShake = 0.5 }
    const slowDown = () => { this.fovTarget = this.options.fov; this.speedUpTarget = 0; this.cameraShake = 0 }
    this.container.addEventListener('mousedown', speedUp)
    this.container.addEventListener('mouseup', slowDown)
    this.container.addEventListener('mousemove', e => {
      this.mouse.targetX = (e.clientX / this.container.offsetWidth) * 2 - 1
      this.mouse.targetY = -(e.clientY / this.container.offsetHeight) * 2 + 1
    })
    this.container.addEventListener('touchstart', speedUp, { passive: true })
    this.container.addEventListener('touchend', slowDown, { passive: true })
    window.addEventListener('resize', () => {
      const w = this.container.offsetWidth, h = this.container.offsetHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
    })
  }

  private update(delta: number) {
    const t = Math.min(delta * 5, 1)
    this.speedUp = lerp(this.speedUp, this.speedUpTarget, t)
    this.timeOffset += this.speedUp * delta
    const time = this.clock.elapsedTime + this.timeOffset

    this.scrollY = lerp(this.scrollY, this.scrollTarget, 0.08)

    this.camera.fov = lerp(this.camera.fov, this.fovTarget + this.scrollY * 20, t)
    this.camera.updateProjectionMatrix()

    this.mouse.x = lerp(this.mouse.x, this.mouse.targetX, 0.1)
    this.mouse.y = lerp(this.mouse.y, this.mouse.targetY, 0.1)

    this.cameraShake = lerp(this.cameraShake, 0, 0.1)
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.2
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.2
    
    const parallaxY = this.scrollY * 8
    const parallaxZ = this.scrollY * 15
    const parallaxRotation = this.scrollY * 0.3
    
    this.camera.position.set(
      this.mouse.x * 2 + shakeX + Math.sin(this.scrollY * 2) * 2, 
      8 + Math.sin(time * 0.5) * 0.3 + this.mouse.y + shakeY + parallaxY, 
      -5 + parallaxZ
    )
    this.camera.rotation.z = parallaxRotation
    this.camera.lookAt(0, 7 + this.mouse.y * 2 + this.scrollY * 5, -100)

    const updateLights = (lights: THREE.Group, deltaZ: number, resetCheck: (z: number) => boolean) => {
      lights.children.forEach((light: any) => {
        const scrollEffect = this.scrollY * light.parallaxFactor * 50
        const waveEffect = Math.sin(time + light.position.x) * 0.5 * this.scrollY
        light.position.z += deltaZ + scrollEffect * delta
        light.position.y += waveEffect * delta
        if (light.pointLight) {
          light.pointLight.position.copy(light.position)
          if (lights === this.rightLights) {
            const factor = Math.max(0, 1 - (-light.position.z / this.options.length))
            const scrollBrightness = 1 + this.scrollY * 2
            light.pointLight.intensity = (0.8 + factor * 1.5) * scrollBrightness
          }
        }
        if (resetCheck(light.position.z)) light.position.z = light.startZ
      })
    }

    updateLights(this.leftLights, (60 + this.speedUp * 20) * delta, z => z > 20)
    updateLights(this.rightLights, (-120 - this.speedUp * 30) * delta, z => z < -this.options.length - 20)

    const stickSpeed = (60 + this.speedUp * 40) * delta
    ;[this.leftSticks, this.rightSticks].forEach(group => {
      group.children.forEach((stick: any) => {
        const scrollEffect = this.scrollY * stick.parallaxFactor * 40
        const sway = Math.sin(time * 2 + stick.position.z * 0.1) * 0.3 * this.scrollY
        stick.position.z += stickSpeed + scrollEffect * delta
        stick.rotation.z = sway
        if (stick.topLight) {
          stick.topLight.position.z = stick.position.z
          stick.topLight.intensity = 0.3 + this.scrollY * 0.5
        }
        if (stick.position.z > 20) stick.position.z = stick.startZ
      })
    })

    this.scene.children.forEach((child: any) => {
      if (child.userData.isParticles) {
        const pos = child.geometry.attributes.position
        const scrollEffect = this.scrollY * child.userData.parallaxFactor * 60
        const rotation = this.scrollY * Math.PI * 0.5
        child.rotation.y = rotation
        for (let i = 0; i < pos.count; i++) {
          pos.array[i * 3 + 2] += (50 + this.speedUp * 30 + scrollEffect) * delta
          pos.array[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.02 * this.scrollY
          if (pos.array[i * 3 + 2] > 20) pos.array[i * 3 + 2] = -this.options.length
        }
        pos.needsUpdate = true
        const mat = child.material as THREE.PointsMaterial
        mat.size = 0.1 + this.scrollY * 0.3
        mat.opacity = 0.6 + this.scrollY * 0.3
      }
    })
  }

  private tick = () => {
    if (this.disposed) return
    this.update(this.clock.getDelta())
    this.renderer.render(this.scene, this.camera)
    this.animationId = requestAnimationFrame(this.tick)
  }

  dispose() {
    this.disposed = true
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.renderer.dispose()
    this.scene.clear()
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}

export default function CryptoBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<HyperspeedApp | null>(null)

  useEffect(() => {
    if (containerRef.current) {
      appRef.current = new HyperspeedApp(containerRef.current, defaultOptions)
    }

    const handleScroll = () => {
      if (appRef.current) {
        const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
        appRef.current.setScroll(scrollProgress)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      appRef.current?.dispose()
      appRef.current = null
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}