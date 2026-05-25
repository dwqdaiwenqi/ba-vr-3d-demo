import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { createNoise3D } from 'simplex-noise'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { type ClickableSprite, createUISpriteAdder, preloadMaterials } from './uiSprite'
import { setupGUI, type FloorGridRef } from './setupGUI'

// import bannerUrl from '@/assets/image/banner_title.webp'
// import navLeftUrl from '@/assets/image/nav_icon_left.webp'
// import navRightUrl from '@/assets/image/nav_icon_right.webp'

import bannerUrl from '@/assets/image/logo.png'
import starUrl from '@/assets/image/star.png'
import StartBtnUrl from '@/assets/image/Vector.png'

const GUI = window.dat.GUI

const Playground = () => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current!

    // ── 场景 ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(devicePixelRatio)
    renderer.setSize(innerWidth, innerHeight)
    renderer.setClearColor(0xddeeff)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xffffff, 0.004)

    const uiTw = new TWEEN.Group()

    // 自定义天空盒：蓝粉渐变色 + fbm 噪声云朵
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(100, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uTopColor: { value: new THREE.Color('#EBF7FF') },
          uBottomColor: { value: new THREE.Color('#F2F1FF') },
          uCloudColor: { value: new THREE.Color('#ffffff') },
          uCloudCoverage: { value: 0.45 },
          uCloudDensity: { value: 0.7 },
          uCloudScale: { value: 2.5 },
          uCloudSpeed: { value: 0.015 },
          uGradientPow: { value: 2 },
          uShowCloud: { value: 1.0 },
          uEdge0: { value: 0.4 },
          uEdge1: { value: 0.6 }
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorldDir;
          void main() {
            vWorldDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3  uTopColor;
          uniform vec3  uBottomColor;
          uniform vec3  uCloudColor;
          uniform float uCloudCoverage;
          uniform float uCloudDensity;
          uniform float uCloudScale;
          uniform float uCloudSpeed;
          uniform float uGradientPow;
          uniform float uShowCloud;
          uniform float uEdge0;
          uniform float uEdge1;
          varying vec3 vWorldDir;

          float hash(vec2 p) {
            p = fract(p * vec2(127.1, 311.7));
            p += dot(p, p + 19.19);
            return fract(p.x * p.y);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1,0)), u.x),
              mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
              u.y
            );
          }
          float fbm(vec2 p) {
            float v = 0.0; float a = 0.5;
            for (int i = 0; i < 5; i++) {
              v += a * noise(p);
              p = p * 2.1 + vec2(1.7, 9.2);
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec3 dir = normalize(vWorldDir);
            float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
            t = pow(t, uGradientPow);
            float mask = smoothstep(uEdge0, uEdge1, t);
            vec3 skyColor = mix(uBottomColor, uTopColor, mask);

            float cloudMask = 0.0;
            if (dir.y > 0.0) {
              vec2 uv = dir.xz / (dir.y + 0.1) * uCloudScale;
              uv.x += uTime * uCloudSpeed;
              float n = fbm(uv) * 0.6 + 0.4 * fbm(uv * 2.0 + 3.7);
              float horizon = smoothstep(0.0, 0.25, dir.y);
              cloudMask = smoothstep(1.0 - uCloudCoverage, 1.0 - uCloudCoverage + 0.3, n) * horizon;
            }

            vec3 color = mix(skyColor, uCloudColor, cloudMask * uCloudDensity * uShowCloud);
            gl_FragColor = vec4(color, 1.0);
          }
        `
      })
    )
    scene.add(skyDome)

    const camTarget = new THREE.Vector3(0, 0, 50)

    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
    camera.position.set(0, 0, camTarget.z)
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, -1)))

    // ── 设计稿 UI 辅助函数 ────────────────────────────────
    const loader = new THREE.TextureLoader()

    const clickableSprites: ClickableSprite[] = []
    let hoveredSpriteMesh: THREE.Mesh | null = null

    const raycaster = new THREE.Raycaster()
    const pointerNDC = new THREE.Vector2()

    const addUISprite = createUISpriteAdder(scene, clickableSprites)

    preloadMaterials(
      { banner: bannerUrl, star: starUrl, startBtn: StartBtnUrl },
      loader,
      (loaded, total) => console.log(`Loading: ${loaded}/${total}`)
    ).then((mats) => {
      // mats['banner'] / mats['startBtn'] 等都是 MeshBasicMaterial，直接传给 addUISprite

      console.log('mats', mats)

      const cx = 1920 / 2
      const banner = addUISprite({
        material: mats['banner'],
        itemW: 800,
        left: cx - 800 / 2,
        top: 250,
        z: 0
      })

      addUISprite({
        material: mats['startBtn'],
        itemW: 300,
        left: cx - 300 / 2,
        top: 650,
        z: 0,
        onHover: (mesh) => {
          new TWEEN.Tween(mesh.scale, uiTw)
            .to({ x: 1.08, y: 1.08 }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start()
          new TWEEN.Tween((mesh.material as THREE.MeshBasicMaterial).color, uiTw)
            .to({ r: 1.1, g: 1.1, b: 1.1 }, 150)
            .start()
        },
        onHoverOut: (mesh) => {
          new TWEEN.Tween(mesh.scale, uiTw)
            .to({ x: 1.0, y: 1.0 }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start()
          new TWEEN.Tween((mesh.material as THREE.MeshBasicMaterial).color, uiTw)
            .to({ r: 1.0, g: 1.0, b: 1.0 }, 150)
            .start()
        },
        onClick: () => {
          new TWEEN.Tween({ t: 1 }, uiTw)
            .to({ t: 0 }, 300)
            .delay(400)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate((v) => {
              banner.material.opacity = v.t
            })
            .start()

          new TWEEN.Tween({ t: 0 }, uiTw)
            .to({ t: 7 }, 1500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate((v) => {
              barrelPass.uniforms.maskSoft.value = v.t
            })
            .start()
        }
      })

      const star1 = addUISprite({
        material: mats['star'].clone(),
        itemW: 200,
        left: cx - 700 - 200 / 2,
        top: 200,
        z: -50
      })

      const star2 = addUISprite({
        material: mats['star'].clone(),
        itemW: 200,
        left: 1920 / 2 + 700 - 200 / 2,
        top: 200,
        z: -50
      })

      star2.rotation.z = 180

      const star3 = addUISprite({
        material: mats['star'].clone(),
        itemW: 60,
        left: cx - 500 - 60 / 2,
        top: 380,
        z: -150
      })

      const star4 = addUISprite({
        material: mats['star'].clone(),
        itemW: 60,
        left: cx + 500 - 60 / 2,
        top: 380,
        z: -150
      })

      star4.rotation.z = 180
    })

    const SEG_X = 100
    const SEG_Y = 100
    const SIZE = 400
    const COLS = SEG_X + 1
    const ROWS = SEG_Y + 1
    const HALF = SIZE / 2

    let planeCurve = -20

    // ── 地面网格（线框 + 填充面）────────────────────────────
    function createFloorGrid(curve: number) {
      type Vert = { x: number; y: number; z: number; initZ: number; phase: number; amp: number }
      const verts: Vert[] = []
      const segPairs: [number, number][] = []

      // 生成顶点数据
      for (let row = 0; row <= SEG_Y; row++) {
        for (let col = 0; col <= SEG_X; col++) {
          const x = col * (SIZE / SEG_X) - HALF
          const y = row * (SIZE / SEG_Y) - HALF
          const t = (row * COLS + col) / (COLS * ROWS)
          const initZ = Math.sin(t * Math.PI) * curve
          verts.push({
            x,
            y,
            z: initZ,
            initZ,
            phase: Math.random() * Math.PI * 2,
            amp: Math.random() * 10 + 5
          })
          const i = row * COLS + col
          if (col < SEG_X) segPairs.push([i, i + 1])
          if (row < SEG_Y) segPairs.push([i, (row + 1) * COLS + col])
        }
      }

      // 线框层：网格线，比填充面稍微高一点避免 z-fighting
      const linesPosArr = new Float32Array(segPairs.length * 6)
      const linesGeo = new THREE.BufferGeometry()
      linesGeo.setAttribute('position', new THREE.BufferAttribute(linesPosArr, 3))
      const gridLines = new THREE.LineSegments(
        linesGeo,
        new THREE.LineBasicMaterial({ color: '#88b0d8', transparent: true, opacity: 0.7 })
      )
      gridLines.rotation.x = -Math.PI / 2
      gridLines.rotation.z = Math.PI / 2
      scene.add(gridLines)

      // 填充面层：纯色面片，提供地面颜色底色
      const fillPosArr = new Float32Array(verts.length * 3)
      const meshIndices: number[] = []
      for (let row = 0; row < SEG_Y; row++) {
        for (let col = 0; col < SEG_X; col++) {
          const a = row * COLS + col
          const b = row * COLS + col + 1
          const c = (row + 1) * COLS + col
          const d = (row + 1) * COLS + col + 1
          meshIndices.push(a, b, d, a, d, c)
        }
      }
      const fillGeo = new THREE.BufferGeometry()
      fillGeo.setAttribute('position', new THREE.BufferAttribute(fillPosArr, 3))
      fillGeo.setIndex(meshIndices)
      const gridFill = new THREE.Mesh(
        fillGeo,
        new THREE.MeshBasicMaterial({
          color: '#dde8f8',
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
          fog: true
        })
      )
      gridFill.rotation.x = -Math.PI / 2
      gridFill.rotation.z = Math.PI / 2
      scene.add(gridFill)

      return { gridLines, gridFill, verts, segPairs, linesPosArr, linesGeo, fillPosArr, fillGeo }
    }

    function removeFloorGrid(gridLines: THREE.LineSegments, gridFill: THREE.Mesh) {
      scene.remove(gridLines)
      scene.remove(gridFill)
      gridLines.geometry.dispose()
      ;(gridLines.material as THREE.Material).dispose()
      gridFill.geometry.dispose()
      ;(gridFill.material as THREE.Material).dispose()
    }

    const updateGridLineBuffer = () => {
      for (let s = 0; s < segPairs.length; s++) {
        const [indexA, indexB] = segPairs[s]
        const a = verts[indexA]
        const b = verts[indexB]
        const offset = s * 6
        linesPosArr[offset + 0] = a.x
        linesPosArr[offset + 1] = a.y
        linesPosArr[offset + 2] = a.z
        linesPosArr[offset + 3] = b.x
        linesPosArr[offset + 4] = b.y
        linesPosArr[offset + 5] = b.z
      }
      linesGeo.attributes.position.needsUpdate = true
    }
    const updateGridFillBuffer = () => {
      for (let i = 0; i < verts.length; i++) {
        fillPosArr[i * 3 + 0] = verts[i].x
        fillPosArr[i * 3 + 1] = verts[i].y
        fillPosArr[i * 3 + 2] = verts[i].z
      }
      fillGeo.attributes.position.needsUpdate = true
    }

    let { gridLines, gridFill, verts, segPairs, linesPosArr, linesGeo, fillPosArr, fillGeo } =
      createFloorGrid(planeCurve)

    // ── 后处理：VR 遮罩 ───────────────────────────────────
    const BarrelShader = {
      uniforms: {
        tDiffuse: { value: null },
        maskRX: { value: 0.5 },
        maskRY: { value: 0.5 },
        maskN: { value: 5.5 },
        maskSoft: { value: 0 },
        maskColor: { value: new THREE.Color(1, 1, 1) },
        barrel: { value: 0.3 },
        barrelCenter: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float maskRX;
        uniform float maskRY;
        uniform float maskN;
        uniform float maskSoft;
        uniform vec3 maskColor;
        uniform float barrel;
        uniform vec2 barrelCenter;
        varying vec2 vUv;

        vec2 distort(vec2 uv, float k) {
          // scale: 整体缩小采样范围，防止畸变后边角超出 0~1 导致拉伸
          // k 越大缩得越小，刚好让边角畸变后落在边界内
          float scale = 1.0 + k * 0.5;

          // d: 从畸变中心 → 当前像素的偏移向量
          // 除以 scale 是把坐标整体往中心收一点
          // 例如 uv=(0.8,0.5), center=(0.5,0.5) → d=(0.3,0.0)/scale
          vec2 d = (uv - barrelCenter) / scale;

          // dist: 当前像素离中心的距离（标量）
          // 越靠边缘 dist 越大
          float dist = length(d);

          // 拉伸 d 向量：离中心越远，d 被拉得越长
          // (1.0 + k * dist) 是拉伸系数，dist=0 时系数=1不变，dist越大系数越大
          // 最后加回 barrelCenter，得到畸变后的采样坐标
          return barrelCenter + d * (1.0 + k * dist);
        }

        void main() {
          // ── 超椭圆遮罩 ──
          vec2 d = abs(vUv - vec2(0.5, 0.5)) / vec2(maskRX, maskRY);
          float dist = pow(pow(d.x, maskN) + pow(d.y, maskN), 1.0 / maskN);
          float mask = smoothstep(1.0 - maskSoft, 1.0, dist);

          if (mask >= 1.0) {
            gl_FragColor = vec4(maskColor, 1.0);
            return;
          }

          // ── 桶形畸变 ──
          vec2 uv = distort(vUv, barrel);
          vec4 color = texture2D(tDiffuse, uv);
          gl_FragColor = vec4(mix(color.rgb, maskColor, mask), 1.0);
        }
      `
    }

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const barrelPass = new ShaderPass(BarrelShader)
    composer.addPass(barrelPass)

    const noise3D = createNoise3D()

    // ── dat.GUI ───────────────────────────────────────────
    const gui = new GUI()
    const planeCurveRef = { value: planeCurve }
    const floorRef: FloorGridRef = {
      gridLines,
      gridFill,
      verts,
      segPairs,
      linesPosArr,
      linesGeo,
      fillPosArr,
      fillGeo
    }

    const { params } = setupGUI({
      gui,
      barrelPass,
      camera,
      camTarget,
      skyDome,
      uiTw,
      floorRef,
      planeCurveRef,
      createFloorGrid,
      removeFloorGrid,
      onFloorRebuild: (result) => {
        planeCurve = planeCurveRef.value
        ;({ gridLines, gridFill, verts, segPairs, linesPosArr, linesGeo, fillPosArr, fillGeo } =
          result)
        Object.assign(floorRef, result)
      }
    })

    const skyDomeUni = (skyDome.material as THREE.ShaderMaterial).uniforms

    // ── 入场动画 ──────────────────────────────────────────
    new TWEEN.Tween({ rx: params.axisAngle }, uiTw)
      .to({ rx: 0 }, 1300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj: { rx: number }) => {
        camera.rotation.x = obj.rx
      })
      .start()

    new TWEEN.Tween({ maskSoft: params.maskSoft }, uiTw)
      .to({ maskSoft: 0 }, 800)
      .delay(1300)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate((obj: { maskSoft: number }) => {
        barrelPass.uniforms.maskSoft.value = obj.maskSoft
      })
      .onComplete(() => {})
      .start()

    addEventListener('mousemove', (e) => {
      const [x, y] = [e.pageX, e.pageY]

      if (params.lockCamera) return

      const sx = x / innerWidth - 0.5
      const sy = y / innerHeight - 0.5

      camTarget.set(sx * 8, sy * -4, camTarget.z)

      // hover cursor & 触发 onHover / onHoverOut 回调
      pointerNDC.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1)
      raycaster.setFromCamera(pointerNDC, camera)
      const hovered = raycaster.intersectObjects(clickableSprites.map((s) => s.mesh))
      const newHovered = hovered.length > 0 ? (hovered[0].object as THREE.Mesh) : null

      if (newHovered !== hoveredSpriteMesh) {
        if (hoveredSpriteMesh) {
          const prev = clickableSprites.find((s) => s.mesh === hoveredSpriteMesh)
          prev?.onHoverOut?.(hoveredSpriteMesh)
        }
        if (newHovered) {
          const next = clickableSprites.find((s) => s.mesh === newHovered)
          next?.onHover?.(newHovered)
        }
        hoveredSpriteMesh = newHovered
      }

      renderer.domElement.style.cursor = hoveredSpriteMesh ? 'pointer' : ''
    })

    addEventListener('click', (e) => {
      pointerNDC.set((e.pageX / innerWidth) * 2 - 1, -(e.pageY / innerHeight) * 2 + 1)
      raycaster.setFromCamera(pointerNDC, camera)
      const hits = raycaster.intersectObjects(clickableSprites.map((s) => s.mesh))
      if (hits.length > 0) {
        const hit = clickableSprites.find((s) => s.mesh === hits[0].object)
        if (hit) hit.onClick?.(hit.mesh)
      }
    })

    // ── 动画循环 ──────────────────────────────────────────
    let rafId: number
    let banner: THREE.Mesh | null = null
    let icon1: THREE.Mesh | null = null
    let icon2: THREE.Mesh | null = null

    function animate() {
      rafId = requestAnimationFrame(animate)
      uiTw.update()
      skyDomeUni.uTime.value = performance.now() * 0.001

      camera.position.lerp(camTarget, 0.1)

      const t = performance.now() * 0.001 * params.waveSpeed
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i]
        // smoothstep 过渡：waveFadeStart~waveFadeEnd 区间内从 0 平滑到 1
        const raw = (v.x - params.waveFadeStart) / (params.waveFadeEnd - params.waveFadeStart)
        const t01 = Math.max(0, Math.min(1, raw))
        const waveFade = t01 * t01 * (3 - 2 * t01)

        if (waveFade === 0) continue
        let n = 0
        switch (params.waveType) {
          case 'traveling':
            n = Math.sin(t * 2 + v.x * 0.15)
            break
          case 'interfere':
            n =
              Math.sin(t * 2 + v.x * 0.1) * 0.6 + Math.sin(t * 1.3 + v.x * 0.05 + v.y * 0.08) * 0.4
            break
          case 'radial':
            n = Math.sin(t * 1.5 - Math.sqrt(v.x * v.x + v.y * v.y) * 0.1)
            break
          case 'random':
            n = Math.abs(Math.sin(t + v.phase))
            break
          case 'noise':
            // n = (noise3D(v.x * 0.02, v.y * 0.02, t * 0.4) + 1) / 2
            n = noise3D(v.x * 0.02, v.y * 0.02, t * 0.4)
            break
        }
        v.z = v.initZ + n * v.amp * params.waveAmp * waveFade
      }

      updateGridFillBuffer()
      updateGridLineBuffer()

      composer.render()
    }

    animate()

    const onResize = () => {
      camera.aspect = innerWidth / innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(innerWidth, innerHeight)
      composer.setSize(innerWidth, innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      gui.destroy()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default Playground
