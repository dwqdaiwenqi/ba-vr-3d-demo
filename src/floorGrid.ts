import * as THREE from 'three'

export type Vert = { x: number; y: number; z: number; initZ: number; seed: number; amp: number }

export type FloorGridRef = {
  gridLines: THREE.LineSegments
  gridFill: THREE.Mesh
  verts: Vert[]
  segPairs: [number, number][]
  linesPosArr: Float32Array
  linesGeo: THREE.BufferGeometry
  fillPosArr: Float32Array
  fillGeo: THREE.BufferGeometry
}

const SEG_X = 100
const SEG_Y = 100
const SIZE = 400
const COLS = SEG_X + 1
const ROWS = SEG_Y + 1
const HALF = SIZE / 2

export function createFloorGrid(scene: THREE.Scene, curve: number): FloorGridRef {
  const verts: Vert[] = []
  const segPairs: [number, number][] = []

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
        seed: Math.random() * Math.PI * 2,
        amp: Math.random() * 10 + 5
      })
      const i = row * COLS + col
      if (col < SEG_X) segPairs.push([i, i + 1])
      if (row < SEG_Y) segPairs.push([i, (row + 1) * COLS + col])
    }
  }

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
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    })
  )
  gridFill.rotation.x = -Math.PI / 2
  gridFill.rotation.z = Math.PI / 2
  scene.add(gridFill)

  return { gridLines, gridFill, verts, segPairs, linesPosArr, linesGeo, fillPosArr, fillGeo }
}

export function removeFloorGrid(
  scene: THREE.Scene,
  gridLines: THREE.LineSegments,
  gridFill: THREE.Mesh
) {
  scene.remove(gridLines)
  scene.remove(gridFill)
  gridLines.geometry.dispose()
  ;(gridLines.material as THREE.Material).dispose()
  gridFill.geometry.dispose()
  ;(gridFill.material as THREE.Material).dispose()
}

export function updateGridLineBuffer(
  segPairs: [number, number][],
  verts: Vert[],
  linesPosArr: Float32Array,
  linesGeo: THREE.BufferGeometry
) {
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

export function updateGridFillBuffer(
  verts: Vert[],
  fillPosArr: Float32Array,
  fillGeo: THREE.BufferGeometry
) {
  for (let i = 0; i < verts.length; i++) {
    fillPosArr[i * 3 + 0] = verts[i].x
    fillPosArr[i * 3 + 1] = verts[i].y
    fillPosArr[i * 3 + 2] = verts[i].z
  }
  fillGeo.attributes.position.needsUpdate = true
}
