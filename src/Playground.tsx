import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import * as TWEEN from '@tweenjs/tween.js'
import { createNoise3D } from 'simplex-noise'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import {
  type ClickableSprite,
  createUISpriteAdder,
  createPointerHandler,
  preloadMaterials
} from './uiSprite'
import { setupGUI, defaultParams, defaultSkyDomeParams } from './setupGUI'
import {
  type FloorGridRef,
  createFloorGrid,
  removeFloorGrid,
  updateGridLineBuffer,
  updateGridFillBuffer
} from './floorGrid'
import { waveFns, createNoiseFn } from './waveTypes'
import { smoothstep } from './helper/smoothstep'
import skyDomeVert from './shaders/skyDome.vert.glsl?raw'
import skyDomeFrag from './shaders/skyDome.frag.glsl?raw'
import barrelVert from './shaders/barrel.vert.glsl?raw'
import barrelFrag from './shaders/barrel.frag.glsl?raw'

import bannerUrl from '@/assets/image/logo.png'
import starUrl from '@/assets/image/star.png'
import StartBtnUrl from '@/assets/image/Vector.png'

const GUI = window.dat.GUI

const Playground = () => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current!

    if (!WebGL.isWebGLAvailable()) {
      mount.innerHTML = `<img src="${bannerUrl}" style="width:100%;height:100%;object-fit:cover" />`
      return
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(devicePixelRatio)
    renderer.setSize(innerWidth, innerHeight)
    renderer.setClearColor(0xddeeff)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xffffff, 0.004)
    const uiTw = new TWEEN.Group()

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(100, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uTopColor: { value: new THREE.Color(defaultSkyDomeParams.topColor) },
          uBottomColor: { value: new THREE.Color(defaultSkyDomeParams.bottomColor) },
          uCloudColor: { value: new THREE.Color(defaultSkyDomeParams.cloudColor) },
          uCloudCoverage: { value: defaultSkyDomeParams.cloudCoverage },
          uCloudDensity: { value: defaultSkyDomeParams.cloudDensity },
          uCloudScale: { value: defaultSkyDomeParams.cloudScale },
          uCloudSpeed: { value: defaultSkyDomeParams.cloudSpeed },
          uGradientPow: { value: defaultSkyDomeParams.gradientPow },
          uShowCloud: { value: defaultSkyDomeParams.showCloud ? 1.0 : 0.0 },
          uEdge0: { value: defaultSkyDomeParams.edge0 },
          uEdge1: { value: defaultSkyDomeParams.edge1 }
        },
        vertexShader: skyDomeVert,
        fragmentShader: skyDomeFrag
      })
    )
    scene.add(skyDome)

    const camTarget = new THREE.Vector3(0, 0, 50)

    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 1000)
    camera.position.set(0, 0, camTarget.z)
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, -1)))

    const loader = new THREE.TextureLoader()

    const clickableSprites: ClickableSprite[] = []
    const addUISprite = createUISpriteAdder(scene, clickableSprites)

    preloadMaterials(
      { banner: bannerUrl, star: starUrl, startBtn: StartBtnUrl },
      loader,
      (loaded, total) => console.log(`Loading: ${loaded}/${total}`)
    ).then((mats) => {
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

    let planeCurve = defaultParams.planeCurve

    let { gridLines, gridFill, verts, segPairs, linesPosArr, linesGeo, fillPosArr, fillGeo } =
      createFloorGrid(scene, planeCurve)

    const BarrelShader = {
      uniforms: {
        tDiffuse: { value: null },
        maskRX: { value: defaultParams.maskRX },
        maskRY: { value: defaultParams.maskRY },
        maskN: { value: defaultParams.maskN },
        maskSoft: { value: defaultParams.maskSoft },
        maskColor: { value: new THREE.Color(defaultParams.maskColor) },
        barrel: { value: defaultParams.barrel },
        barrelCenter: { value: new THREE.Vector2(defaultParams.barrelCX, defaultParams.barrelCY) }
      },
      vertexShader: barrelVert,
      fragmentShader: barrelFrag
    }

    // VR 遮罩和桶形畸变需要对整张画面做像素级处理，必须在场景渲染完后作为全屏后处理步骤执行。
    // RenderPass 先把场景渲染到离屏纹理，ShaderPass 再把这张纹理作为输入做二次处理后输出到屏幕。
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const barrelPass = new ShaderPass(BarrelShader)
    composer.addPass(barrelPass)

    const noise3D = createNoise3D()
    const allWaveFns: Record<string, ReturnType<typeof createNoiseFn>> = {
      ...waveFns,
      noise: createNoiseFn(noise3D)
    }

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

    gridLines.position.y = defaultParams.planeY
    gridLines.position.z = defaultParams.planeZ
    gridFill.position.y = defaultParams.planeY
    gridFill.position.z = defaultParams.planeZ
    ;(camera as THREE.PerspectiveCamera).rotation.x = defaultParams.axisAngle

    const { params } = setupGUI({
      gui,
      barrelPass,
      camera,
      camTarget,
      skyDome,
      uiTw,
      floorRef,
      planeCurveRef,
      createFloorGrid: (curve) => createFloorGrid(scene, curve),
      removeFloorGrid: (lines, fill) => removeFloorGrid(scene, lines, fill),
      onFloorRebuild: (result) => {
        planeCurve = planeCurveRef.value
        ;({ gridLines, gridFill, verts, segPairs, linesPosArr, linesGeo, fillPosArr, fillGeo } =
          result)
        Object.assign(floorRef, result)
      }
    })

    const skyDomeUni = (skyDome.material as THREE.ShaderMaterial).uniforms

    function playIntroAnimation() {
      new TWEEN.Tween({ rx: params.axisAngle, ry: -params.axisAngle * 0 }, uiTw)
        .to({ rx: 0, ry: 0 }, 1300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj: { rx: number; ry: number }) => {
          camera.rotation.x = obj.rx
          camera.rotation.y = obj.ry
        })
        .start()

      new TWEEN.Tween({ maskSoft: params.maskSoft }, uiTw)
        .to({ maskSoft: 0 }, 800)
        .delay(1300)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate((obj: { maskSoft: number }) => {
          barrelPass.uniforms.maskSoft.value = obj.maskSoft
        })
        .start()
    }

    playIntroAnimation()

    const { destroy: destroyPointer } = createPointerHandler({
      camera,
      domElement: renderer.domElement,
      sprites: clickableSprites,
      onMouseMove(e) {
        if (params.lockCamera) return
        const sx = e.pageX / innerWidth - 0.5
        const sy = e.pageY / innerHeight - 0.5
        camTarget.set(sx * 8, sy * -4, camTarget.z)
      }
    })

    let rafId: number

    function animate() {
      rafId = requestAnimationFrame(animate)
      uiTw.update()
      skyDomeUni.uTime.value = performance.now() * 0.001

      camera.position.lerp(camTarget, 0.1)

      const t = performance.now() * 0.001 * params.waveSpeed
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i]
        const waveFade = smoothstep(params.waveFadeStart, params.waveFadeEnd, v.x)

        if (waveFade === 0) continue
        const n = allWaveFns[params.waveType]?.(t, v) ?? 0
        v.z = v.initZ + n * v.amp * params.waveAmp * waveFade
      }

      updateGridFillBuffer(verts, fillPosArr, fillGeo)
      updateGridLineBuffer(segPairs, verts, linesPosArr, linesGeo)

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
      destroyPointer()
      gui.destroy()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default Playground
