import * as THREE from 'three'

export type ClickableSprite = {
  mesh: THREE.Mesh
  onHover?: (mesh: THREE.Mesh) => void
  onHoverOut?: (mesh: THREE.Mesh) => void
  onClick?: (mesh: THREE.Mesh) => void
}

export type AddUISpriteOptions = {
  material: THREE.MeshBasicMaterial
  designW?: number
  itemW: number
  left: number
  top: number
  z: number
  onHover?: (mesh: THREE.Mesh) => void
  onHoverOut?: (mesh: THREE.Mesh) => void
  onClick?: (mesh: THREE.Mesh) => void
}

// 将设计稿像素坐标转换为 3D 世界坐标
// 原理：从相机向该像素方向发射射线，与指定 z 平面求交点
export function designPxToWorld(dsX: number, dsY: number, z: number, designW: number) {
  // 构造与场景相同参数的相机，用于坐标反投影
  // 相机放在 z=50 朝 -z 方向看（与场景相机保持一致）
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
  camera.position.set(0, 0, 50)
  camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, -1)))

  // 设计稿像素 → NDC（归一化设备坐标，范围 [-1, 1]）
  // 先按屏幕/设计稿比例缩放，再映射到 [-1,1]
  // Y 轴取反：设计稿 y 向下，NDC y 向上
  const designScale = innerWidth / designW

  // 1920位置*缩放系数/真实宽度*2-1
  const ndcX = ((dsX * designScale) / innerWidth) * 2 - 1
  const ndcY = -((dsY * designScale) / innerHeight) * 2 + 1

  // 这个ndc位置进行逆变换到世界空间中
  // NDC → 世界空间：unproject 把 NDC 点反投影到相机近平面附近的世界坐标
  const ndcPoint = new THREE.Vector3(ndcX, ndcY, 0.5)
  ndcPoint.unproject(camera)
  // 世界空间中的点 - 相机世界位置
  // 射线方向 = 反投影点 - 相机位置，归一化
  const rayDir = ndcPoint.sub(camera.position).normalize()

  // 射线与 z=指定值的平面求交
  // 射线参数方程：point = camera.position + t × rayDir
  // 令 point.z = z，解出 t：
  //   camera.position.z + t × rayDir.z = z
  //   t = (z - camera.position.z) / rayDir.z
  // t 是射线走了多远，代入 x/y 得到交点的世界坐标

  // 所以，某个点的坐标在世界空间中表示为:
  // z = camera.position.z + t * rayDir.z
  // y = camera.position.y + t * rayDir.y
  // 这里其实是求出设置的z深度的 t 应该是什么
  const t = (z - camera.position.z) / rayDir.z
  // 通过这个t推导出x和z
  return { worldX: camera.position.x + t * rayDir.x, worldY: camera.position.y + t * rayDir.y }
}

/**
 * 批量预加载纹理，返回 url → Texture 的 Map。
 * 传给 createUISpriteAdder 后，addUISprite 会优先从缓存取，无需重复请求。
 */
export async function preloadTextures(
  files: string[],
  loader: THREE.TextureLoader
): Promise<Map<string, THREE.Texture>> {
  const cache = new Map<string, THREE.Texture>()
  await Promise.all(
    files.map(
      (file) =>
        new Promise<void>((resolve, reject) => {
          loader.load(
            file,
            (tex) => {
              cache.set(file, tex)
              resolve()
            },
            undefined,
            reject
          )
        })
    )
  )
  return cache
}

/**
 * 批量预加载纹理并生成 MeshBasicMaterial。
 * 用法：
 *   const mats = await preloadMaterials(
 *     { banner: bannerUrl, startBtn: btnUrl },
 *     loader,
 *     (loaded, total) => console.log(loaded / total)
 *   )
 *   mats['banner']   // THREE.MeshBasicMaterial，已绑定贴图
 *   mats['startBtn'] // THREE.MeshBasicMaterial，已绑定贴图
 */
export async function preloadMaterials<K extends string>(
  files: Record<K, string>,
  loader: THREE.TextureLoader,
  onProgress?: (loaded: number, total: number) => void
): Promise<Record<K, THREE.MeshBasicMaterial>> {
  const entries = Object.entries(files) as [K, string][]
  const total = entries.length
  let loaded = 0
  const pairs = await Promise.all(
    entries.map(
      ([key, file]) =>
        new Promise<[K, THREE.MeshBasicMaterial]>((resolve, reject) => {
          loader.load(
            file,
            (tex) => {
              onProgress?.(++loaded, total)
              resolve([
                key,
                new THREE.MeshBasicMaterial({
                  map: tex,
                  transparent: true,
                  depthWrite: false,
                  depthTest: true,
                  side: THREE.DoubleSide
                })
              ])
            },
            undefined,
            reject
          )
        })
    )
  )
  return Object.fromEntries(pairs) as Record<K, THREE.MeshBasicMaterial>
}

export type PointerHandlerOptions = {
  camera: THREE.PerspectiveCamera
  domElement: HTMLElement
  sprites: ClickableSprite[]
  /** 在指针事件处理完 hover/click 后额外执行的 mousemove 逻辑 */
  onMouseMove?: (e: MouseEvent) => void
}

export function createPointerHandler({
  camera,
  domElement,
  sprites,
  onMouseMove
}: PointerHandlerOptions) {
  const raycaster = new THREE.Raycaster()
  const pointerNDC = new THREE.Vector2()
  let hoveredMesh: THREE.Mesh | null = null

  function toNDC(pageX: number, pageY: number) {
    pointerNDC.set((pageX / innerWidth) * 2 - 1, -(pageY / innerHeight) * 2 + 1)
    raycaster.setFromCamera(pointerNDC, camera)
  }

  function findSprite(mesh: THREE.Mesh) {
    return sprites.find((s) => s.mesh === mesh)
  }

  function handleMove(e: MouseEvent) {
    toNDC(e.pageX, e.pageY)
    const hits = raycaster.intersectObjects(sprites.map((s) => s.mesh))
    const newHovered = hits.length > 0 ? (hits[0].object as THREE.Mesh) : null

    if (newHovered !== hoveredMesh) {
      if (hoveredMesh) findSprite(hoveredMesh)?.onHoverOut?.(hoveredMesh)
      if (newHovered) findSprite(newHovered)?.onHover?.(newHovered)
      hoveredMesh = newHovered
    }

    domElement.style.cursor = hoveredMesh ? 'pointer' : ''
    onMouseMove?.(e)
  }

  function handleClick(e: MouseEvent) {
    toNDC(e.pageX, e.pageY)
    const hits = raycaster.intersectObjects(sprites.map((s) => s.mesh))
    if (hits.length > 0) {
      const hit = findSprite(hits[0].object as THREE.Mesh)
      hit?.onClick?.(hit.mesh)
    }
  }

  window.addEventListener('mousemove', handleMove)
  window.addEventListener('click', handleClick)

  return {
    destroy() {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('click', handleClick)
    }
  }
}

export function createUISpriteAdder(scene: THREE.Scene, clickableSprites: ClickableSprite[]) {
  return function addUISprite(options: AddUISpriteOptions): THREE.Mesh {
    const { material, designW = 1920, itemW, left, top, z, onHover, onHoverOut, onClick } = options
    const img = (material.map as THREE.Texture).image as HTMLImageElement
    const aspect = img.width / img.height
    const { worldX: x0, worldY: y0 } = designPxToWorld(left, top, z, designW)
    const { worldX: x1 } = designPxToWorld(left + itemW, top, z, designW)
    const w = x1 - x0
    const h = w / aspect
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    mesh.renderOrder = 999
    mesh.position.set(x0 + w / 2, y0 - h / 2, z)
    scene.add(mesh)
    if (onHover || onHoverOut || onClick) {
      clickableSprites.push({ mesh, onHover, onHoverOut, onClick })
    }
    return mesh
  }
}
