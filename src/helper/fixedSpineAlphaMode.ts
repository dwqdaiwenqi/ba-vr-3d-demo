import * as PIXI from 'pixi.js'
export default function fixSpineAlphaMode(root: PIXI.DisplayObject) {
  const anyObj = root as any
  if (anyObj.texture && anyObj.texture.baseTexture) {
    const bt = anyObj.texture.baseTexture
    bt.alphaMode = PIXI.ALPHA_MODES.PMA
    bt.update()
  }
  const children: PIXI.DisplayObject[] = anyObj.children || []
  for (const child of children) {
    fixSpineAlphaMode(child)
  }
}
