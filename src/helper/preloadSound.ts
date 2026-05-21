import { sound } from '@pixi/sound'

export default async function preloadSound(alias: string, url: string): Promise<void> {
  console.log('alias', alias)
  // if (sound.exists(alias)) {
  //   console.log(`[preloadSound] Sound "${alias}" already loaded, skipping.`)
  //   return
  // }

  return new Promise((resolve, reject) => {
    sound.add(alias, {
      url,
      preload: true,
      loaded: (err) => {
        if (err) {
          console.error(`[preloadSound] Failed to load "${alias}":`, err)
          reject(err)
        } else {
          console.log(`[preloadSound] Loaded "${alias}"`)
          resolve()
        }
      }
    })
  })
}
