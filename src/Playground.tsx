import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { createNoise3D } from 'simplex-noise'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

import bannerUrl from '@/assets/image/banner_title.webp'
import navLeftUrl from '@/assets/image/nav_icon_left.webp'
import navRightUrl from '@/assets/image/nav_icon_right.webp'

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

    let camFinX = 0
    let camFinY = 0

    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
    camera.position.set(camFinX, camFinY, 50)
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, -1)))

    // ── 设计稿 UI 辅助函数 ────────────────────────────────
    const loader = new THREE.TextureLoader()

    function designPxToWorld(dsX: number, dsY: number, z: number, designW: number) {
      const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
      camera.position.set(0, 0, 50)
      camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, -1)))

      const designScale = innerWidth / designW
      const ndcX = ((dsX * designScale) / innerWidth) * 2 - 1
      const ndcY = -((dsY * designScale) / innerHeight) * 2 + 1
      const ndcPoint = new THREE.Vector3(ndcX, ndcY, 0.5)
      ndcPoint.unproject(camera)
      const rayDir = ndcPoint.sub(camera.position).normalize()
      const t = (z - camera.position.z) / rayDir.z
      return { worldX: camera.position.x + t * rayDir.x, worldY: camera.position.y + t * rayDir.y }
    }

    function addUISprite({
      file,
      designW,
      itemW,
      left,
      top,
      z
    }: {
      file: string
      designW: number
      itemW: number
      left: number
      top: number
      z: number
    }) {
      return new Promise<THREE.Mesh>((resolve) => {
        loader.load(file, (tex) => {
          const aspect = tex.image.width / tex.image.height
          const { worldX: x0, worldY: y0 } = designPxToWorld(left, top, z, designW)
          const { worldX: x1 } = designPxToWorld(left + itemW, top, z, designW)
          const w = x1 - x0
          const h = w / aspect
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              depthWrite: false,
              depthTest: true,
              side: THREE.DoubleSide
            })
          )
          mesh.renderOrder = 999
          mesh.position.set(x0 + w / 2, y0 - h / 2, z)
          scene.add(mesh)
          resolve(mesh)
        })
      })
    }

    const SEG_X = 100
    const SEG_Y = 100
    const SIZE = 400
    const COLS = SEG_X + 1
    const ROWS = SEG_Y + 1
    const HALF = SIZE / 2

    const segPairs: [number, number][] = []
    const verts: { x: number; y: number; z: number; initZ: number; phase: number; amp: number }[] =
      []

    for (let row = 0; row <= SEG_Y; row++) {
      for (let col = 0; col <= SEG_X; col++) {
        const x = col * (SIZE / SEG_X) - HALF
        const y = row * (SIZE / SEG_Y) - HALF
        const t = (row * COLS + col) / (COLS * ROWS)
        const initZ = Math.sin(t * Math.PI) * -40
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

    const lineArr = new Float32Array(segPairs.length * 6)
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineArr, 3))

    const plane = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: '#88b0d8', transparent: true, opacity: 0.7 })
    )
    plane.rotation.x = -Math.PI / 2
    plane.rotation.z = Math.PI / 2
    scene.add(plane)

    const meshPosArr = new Float32Array(verts.length * 3)
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
    const meshGeo = new THREE.BufferGeometry()
    meshGeo.setAttribute('position', new THREE.BufferAttribute(meshPosArr, 3))
    meshGeo.setIndex(meshIndices)
    const meshMat = new THREE.MeshBasicMaterial({
      color: '#dde8f8',
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      fog: true
    })
    const fillMesh = new THREE.Mesh(meshGeo, meshMat)
    fillMesh.rotation.x = -Math.PI / 2
    fillMesh.rotation.z = Math.PI / 2
    scene.add(fillMesh)

    // ── 后处理：VR 遮罩 ───────────────────────────────────
    const BarrelShader = {
      uniforms: {
        tDiffuse: { value: null },
        maskRX: { value: 0.5 },
        maskRY: { value: 0.5 },
        maskN: { value: 5.5 },
        maskSoft: { value: 0 },
        maskColor: { value: new THREE.Color(1, 1, 1) }
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
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          vec2 d = abs(vUv - vec2(0.5, 0.5)) / vec2(maskRX, maskRY);
          float dist = pow(pow(d.x, maskN) + pow(d.y, maskN), 1.0 / maskN);
          float mask = smoothstep(1.0 - maskSoft, 1.0, dist);
          gl_FragColor = vec4(mix(color.rgb, maskColor, mask), 1.0);
        }
      `
    }

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const barrelPass = new ShaderPass(BarrelShader)
    composer.addPass(barrelPass)

    const noise3D = createNoise3D()

    Promise.all([
      addUISprite({
        file: bannerUrl,
        designW: 1920,
        itemW: 1000,
        left: 400,
        top: 300,
        z: 0
      }),
      addUISprite({
        file: navLeftUrl,
        designW: 1920,
        itemW: 150,
        left: 100,
        top: 500,
        z: 10
      }),
      addUISprite({
        file: navRightUrl,
        designW: 1920,
        itemW: 150,
        left: 1500,
        top: 300,
        z: -40
      })
    ])
      .then(([b, i1, i2]) => {
        banner = b
        icon1 = i1
        icon2 = i2

        banner.material.opacity = 1
        icon1.material.opacity = 1
        icon2.material.opacity = 1

        // new TWEEN.Tween({ t: 0 }, uiTw)
        //   .to({ t: 1 }, 500)
        //   .easing(TWEEN.Easing.Quadratic.InOut)
        //   .delay(1500)
        //   .onUpdate((obj: { t: number }) => {
        //     if (banner) (banner.material as THREE.MeshBasicMaterial).opacity = obj.t
        //   })
        //   .start()
        // new TWEEN.Tween({ t: 0 }, uiTw)
        //   .to({ t: 1 }, 500)
        //   .easing(TWEEN.Easing.Quadratic.InOut)
        //   .delay(2000)
        //   .onUpdate((obj: { t: number }) => {
        //     if (icon1) (icon1.material as THREE.MeshBasicMaterial).opacity = obj.t
        //   })
        //   .start()
        // new TWEEN.Tween({ t: 0 }, uiTw)
        //   .to({ t: 1 }, 400)
        //   .easing(TWEEN.Easing.Quadratic.InOut)
        //   .delay(2500)
        //   .onUpdate((obj: { t: number }) => {
        //     if (icon2) (icon2.material as THREE.MeshBasicMaterial).opacity = obj.t
        //   })
        //   .start()
      })
      .catch(() => {
        // 图片不存在时忽略，直接启动
      })

    // ── dat.GUI ───────────────────────────────────────────
    const gui = new GUI()
    const params = {
      planeZ: 0,
      planeY: 18,
      waveType: 'radial',
      waveSpeed: 1,
      waveAmp: 1,
      maskRX: 0.5,
      maskRY: 0.5,
      maskN: 5.5,
      maskSoft: 0.6,
      maskColor: '#ffffff',
      camX: 0,
      camY: 0,
      camZ: 50,
      axisAngle: 1.2,
      lockCamera: false
    }

    const skyDomeParams = {
      topColor: '#EBF7FF',
      bottomColor: '#F2F1FF',
      cloudColor: '#ffffff',
      gradientPow: 1.8,
      edge0: 0.25,
      edge1: 0.6,
      showCloud: true,
      cloudCoverage: 0.45,
      cloudDensity: 0.7,
      cloudScale: 2.5,
      cloudSpeed: 0.1
    }

    plane.position.y = params.planeY + 0.1
    plane.position.z = params.planeZ
    fillMesh.position.y = params.planeY
    fillMesh.position.z = params.planeZ

    barrelPass.uniforms.maskSoft.value = params.maskSoft

    camera.rotation.x = params.axisAngle

    const maskFolder = gui.addFolder('VR Mask')
    maskFolder
      .add(params, 'maskRX', 0.1, 1.0, 0.01)
      .name('横轴')
      .onChange((v: number) => {
        barrelPass.uniforms.maskRX.value = v
      })
    maskFolder
      .add(params, 'maskRY', 0.1, 1.0, 0.01)
      .name('纵轴')
      .onChange((v: number) => {
        barrelPass.uniforms.maskRY.value = v
      })
    maskFolder
      .add(params, 'maskN', 2, 16, 0.5)
      .name('圆角程度')
      .onChange((v: number) => {
        barrelPass.uniforms.maskN.value = v
      })
    maskFolder
      .add(params, 'maskSoft', 0, 4, 0.01)
      .name('羽化')
      .onChange((v: number) => {
        barrelPass.uniforms.maskSoft.value = v
      })
    maskFolder
      .addColor(params, 'maskColor')
      .name('遮罩色')
      .onChange((v: string) => {
        barrelPass.uniforms.maskColor.value.set(v)
      })
    maskFolder.close()

    const waveFolder = gui.addFolder('Wave')
    waveFolder
      .add(params, 'waveType', ['traveling', 'interfere', 'radial', 'random', 'noise'])
      .name('类型')
    waveFolder.add(params, 'waveSpeed', 0.1, 5, 0.1).name('速度')
    waveFolder.add(params, 'waveAmp', 0.1, 3, 0.1).name('幅度倍数')
    waveFolder.close()

    gui.add(params, 'planeZ', -100, 100, 1).onChange((v: number) => {
      plane.position.z = v
      fillMesh.position.z = v
    })
    gui.add(params, 'planeY', -100, 100, 1).onChange((v: number) => {
      plane.position.y = v + 0.1
      fillMesh.position.y = v
    })

    const camFolder = gui.addFolder('Camera')
    camFolder
      .add(params, 'camX', -100, 100, 0.5)
      .name('X')
      .onChange((v: number) => {
        if (!params.lockCamera) {
          camFinX = v
        }
      })
    camFolder
      .add(params, 'camY', -100, 100, 0.5)
      .name('Y')
      .onChange((v: number) => {
        if (!params.lockCamera) {
          camFinY = v
        }
      })
    camFolder
      .add(params, 'camZ', 10, 500, 0.5)
      .name('Z')
      .onChange((v: number) => {
        camera.position.z = v
      })
    camFolder
      .add(params, 'axisAngle', -1, 1, 0.01)
      .name('angle')
      .onChange((v: number) => {
        camera.rotation.x = v
      })
    camFolder
      .add(params, 'lockCamera')
      .name('归位并固定')
      .onChange((v: boolean) => {
        if (v) {
          camFinX = 0
          camFinY = 0
        }
      })
    camFolder.open()

    const skyDomeUni = (skyDome.material as THREE.ShaderMaterial).uniforms

    skyDomeUni.uGradientPow.value = skyDomeParams.gradientPow
    skyDomeUni.uCloudSpeed.value = skyDomeParams.cloudSpeed
    skyDomeUni.uEdge0.value = skyDomeParams.edge0

    const skyDomeFolder = gui.addFolder('Sky')
    skyDomeFolder
      .addColor(skyDomeParams, 'topColor')
      .name('顶部颜色')
      .onChange((v: string) => {
        skyDomeUni.uTopColor.value.set(v)
      })
    skyDomeFolder
      .addColor(skyDomeParams, 'bottomColor')
      .name('底部颜色')
      .onChange((v: string) => {
        skyDomeUni.uBottomColor.value.set(v)
      })
    skyDomeFolder
      .addColor(skyDomeParams, 'cloudColor')
      .name('云朵颜色')
      .onChange((v: string) => {
        skyDomeUni.uCloudColor.value.set(v)
      })
    skyDomeFolder
      .add(skyDomeParams, 'cloudCoverage', 0, 1, 0.01)
      .name('云量')
      .onChange((v: number) => {
        skyDomeUni.uCloudCoverage.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'cloudDensity', 0, 1, 0.01)
      .name('云密度')
      .onChange((v: number) => {
        skyDomeUni.uCloudDensity.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'cloudScale', 0.5, 10, 0.1)
      .name('云尺寸')
      .onChange((v: number) => {
        skyDomeUni.uCloudScale.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'cloudSpeed', 0, 0.1, 0.001)
      .name('云速度')
      .onChange((v: number) => {
        skyDomeUni.uCloudSpeed.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'gradientPow', 0.1, 3.0, 0.01)
      .name('渐变曲线')
      .onChange((v: number) => {
        skyDomeUni.uGradientPow.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'edge0', 0.0, 1.0, 0.01)
      .name('交界起点')
      .onChange((v: number) => {
        skyDomeUni.uEdge0.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'edge1', 0.0, 1.0, 0.01)
      .name('交界终点')
      .onChange((v: number) => {
        skyDomeUni.uEdge1.value = v
      })
    skyDomeFolder
      .add(skyDomeParams, 'showCloud')
      .name('显示云朵')
      .onChange((v: boolean) => {
        skyDomeUni.uShowCloud.value = v ? 1.0 : 0.0
      })
    skyDomeFolder.open()

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

      camFinX = sx * 20
      camFinY = sy * -10

      // console.log('sx', sx)
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

      camera.position.x += (camFinX - camera.position.x) * 0.1
      camera.position.y += (camFinY - camera.position.y) * 0.1

      const t = performance.now() * 0.001 * params.waveSpeed
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i]
        if (v.x < 170) continue
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
        v.z = v.initZ + n * v.amp * params.waveAmp
      }

      for (let s = 0; s < segPairs.length; s++) {
        const [indexA, indexB] = segPairs[s]
        const a = verts[indexA]
        const b = verts[indexB]
        const offset = s * 6
        lineArr[offset + 0] = a.x
        lineArr[offset + 1] = a.y
        lineArr[offset + 2] = a.z
        lineArr[offset + 3] = b.x
        lineArr[offset + 4] = b.y
        lineArr[offset + 5] = b.z
      }
      lineGeo.attributes.position.needsUpdate = true

      for (let i = 0; i < verts.length; i++) {
        meshPosArr[i * 3 + 0] = verts[i].x
        meshPosArr[i * 3 + 1] = verts[i].y
        meshPosArr[i * 3 + 2] = verts[i].z
      }
      meshGeo.attributes.position.needsUpdate = true

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
