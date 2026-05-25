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

export function designPxToWorld(dsX: number, dsY: number, z: number, designW: number) {
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
