import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

// ── 参数默认值 & 类型 ─────────────────────────────────────

export type Params = {
  planeZ: number
  planeY: number
  planeCurve: number
  waveType: string
  waveSpeed: number
  waveAmp: number
  waveFadeStart: number
  waveFadeEnd: number
  maskRX: number
  maskRY: number
  maskN: number
  maskSoft: number
  maskColor: string
  barrel: number
  barrelCX: number
  barrelCY: number
  camX: number
  camY: number
  camZ: number
  axisAngle: number
  lockCamera: boolean
}

export type SkyDomeParams = {
  topColor: string
  bottomColor: string
  cloudColor: string
  gradientPow: number
  edge0: number
  edge1: number
  showCloud: boolean
  cloudCoverage: number
  cloudDensity: number
  cloudScale: number
  cloudSpeed: number
}

export const defaultParams: Params = {
  planeZ: 0,
  planeY: 10,
  planeCurve: -40,
  waveType: 'radial',
  waveSpeed: 1,
  waveAmp: 1,
  waveFadeStart: 120,
  waveFadeEnd: 170,
  maskRX: 0.5,
  maskRY: 0.5,
  maskN: 5.5,
  maskSoft: 0.6,
  maskColor: '#ffffff',
  barrel: 0.3,
  barrelCX: 0.5,
  barrelCY: 0.5,
  camX: 0,
  camY: 0,
  camZ: 50,
  axisAngle: 1.2,
  lockCamera: false
}

export const defaultSkyDomeParams: SkyDomeParams = {
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
  cloudSpeed: 0.2
}

// ── 依赖注入类型 ──────────────────────────────────────────

export type FloorGridRef = {
  gridLines: THREE.LineSegments
  gridFill: THREE.Mesh
  verts: { x: number; y: number; z: number; initZ: number; seed: number; amp: number }[]
  segPairs: [number, number][]
  linesPosArr: Float32Array
  linesGeo: THREE.BufferGeometry
  fillPosArr: Float32Array
  fillGeo: THREE.BufferGeometry
}

export type SetupGUIDeps = {
  gui: InstanceType<typeof window.dat.GUI>
  barrelPass: ShaderPass
  camera: THREE.Camera
  camTarget: THREE.Vector3
  skyDome: THREE.Mesh
  uiTw: TWEEN.Group
  floorRef: FloorGridRef
  planeCurveRef: { value: number }
  createFloorGrid: (curve: number) => FloorGridRef
  removeFloorGrid: (gridLines: THREE.LineSegments, gridFill: THREE.Mesh) => void
  onFloorRebuild: (result: FloorGridRef) => void
}

// ── setupGUI ──────────────────────────────────────────────

export function setupGUI(deps: SetupGUIDeps): {
  params: Params
  skyDomeParams: SkyDomeParams
  setShowCloud: (v: boolean) => void
} {
  const {
    gui,
    barrelPass,
    camera,
    camTarget,
    skyDome,
    floorRef,
    planeCurveRef,
    createFloorGrid,
    removeFloorGrid,
    onFloorRebuild
  } = deps

  const params: Params = { ...defaultParams }
  const skyDomeParams: SkyDomeParams = { ...defaultSkyDomeParams }

  // 初始化应用默认值
  floorRef.gridLines.position.y = params.planeY
  floorRef.gridLines.position.z = params.planeZ
  floorRef.gridFill.position.y = params.planeY
  floorRef.gridFill.position.z = params.planeZ
  barrelPass.uniforms.maskSoft.value = params.maskSoft
  ;(camera as THREE.PerspectiveCamera).rotation.x = params.axisAngle

  const skyDomeUni = (skyDome.material as THREE.ShaderMaterial).uniforms
  skyDomeUni.uGradientPow.value = skyDomeParams.gradientPow
  skyDomeUni.uCloudSpeed.value = skyDomeParams.cloudSpeed
  skyDomeUni.uEdge0.value = skyDomeParams.edge0

  // ── VR Mask ──────────────────────────────────────────────
  const maskFolder = gui.addFolder('VR')
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
    .add(params, 'maskSoft', 0, 7, 0.01)
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
  maskFolder
    .add(params, 'barrel', -1.0, 2.0, 0.01)
    .name('畸变')
    .onChange((v: number) => {
      barrelPass.uniforms.barrel.value = v
    })
  maskFolder
    .add(params, 'barrelCX', 0.0, 1.0, 0.01)
    .name('畸变CX')
    .onChange((v: number) => {
      barrelPass.uniforms.barrelCenter.value.x = v
    })
  maskFolder
    .add(params, 'barrelCY', 0.0, 1.0, 0.01)
    .name('畸变CY')
    .onChange((v: number) => {
      barrelPass.uniforms.barrelCenter.value.y = v
    })
  maskFolder.close()

  // ── Wave ─────────────────────────────────────────────────
  const waveFolder = gui.addFolder('Wave')
  waveFolder
    .add(params, 'waveType', ['traveling', 'interfere', 'radial', 'random', 'noise'])
    .name('类型')
  waveFolder.add(params, 'waveSpeed', 0.1, 5, 0.1).name('速度')
  waveFolder.add(params, 'waveAmp', 0.1, 3, 0.1).name('幅度倍数')
  waveFolder.add(params, 'waveFadeStart', -200, 200, 1).name('过渡起点')
  waveFolder.add(params, 'waveFadeEnd', -200, 200, 1).name('过渡终点')

  waveFolder.close()

  const planeFolder = gui.addFolder('Buffer')
  planeFolder
    .add(params, 'planeCurve', -100, 0, 1)
    .name('弯曲')
    .onChange((v: number) => {
      planeCurveRef.value = v
      removeFloorGrid(floorRef.gridLines, floorRef.gridFill)
      const result = createFloorGrid(planeCurveRef.value)
      onFloorRebuild(result)
      result.gridLines.position.y = params.planeY
      result.gridLines.position.z = params.planeZ
      result.gridFill.position.y = params.planeY
      result.gridFill.position.z = params.planeZ
    })

  planeFolder.add(params, 'planeZ', -50, 50, 1).onChange((v: number) => {
    floorRef.gridLines.position.z = v
    floorRef.gridFill.position.z = v
  })
  planeFolder.add(params, 'planeY', -100, 100, 1).onChange((v: number) => {
    floorRef.gridLines.position.y = v
    floorRef.gridFill.position.y = v
  })
  planeFolder.close()

  // ── Camera ───────────────────────────────────────────────
  const camFolder = gui.addFolder('Camera')
  camFolder
    .add(params, 'camX', -20, 20, 0.1)
    .name('X')
    .onChange((v: number) => {
      if (!params.lockCamera) camTarget.x = v
    })
  camFolder
    .add(params, 'camY', -10, 10, 0.1)
    .name('Y')
    .onChange((v: number) => {
      if (!params.lockCamera) camTarget.y = v
    })
  camFolder
    .add(params, 'axisAngle', -1, 1, 0.01)
    .name('angle')
    .onChange((v: number) => {
      ;(camera as THREE.PerspectiveCamera).rotation.x = v
    })

  camFolder.close()

  // ── Sky ──────────────────────────────────────────────────
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
    .add(skyDomeParams, 'cloudSpeed', 0, 0.3, 0.001)
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
  const showCloudCtrl = skyDomeFolder
    .add(skyDomeParams, 'showCloud')
    .name('显示云朵')
    .onChange((v: boolean) => {
      skyDomeUni.uShowCloud.value = v ? 1.0 : 0.0
    })
  skyDomeFolder.close()

  gui
    .add(params, 'lockCamera')
    .name('归位并固定')
    .onChange((v: boolean) => {
      if (v) camTarget.set(0, 0, camTarget.z)
    })

  function setShowCloud(v: boolean) {
    skyDomeParams.showCloud = v
    skyDomeUni.uShowCloud.value = v ? 1.0 : 0.0
    showCloudCtrl.updateDisplay()
  }

  return { params, skyDomeParams, setShowCloud }
}
