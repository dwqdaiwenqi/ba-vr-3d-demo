import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import autoprefixer from 'autoprefixer'

import { createHtmlPlugin } from 'vite-plugin-html'
// 将pixi作为chunk
// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // 动态按需导入 ESM-only 插件
  const legacy = (await import('@vitejs/plugin-legacy')).default

  console.log('env----', env, 'mode----', mode)
  return {
    assetsInclude: ['**/*.ttf', '**/*.TTF', '**/*.woff', '**/*.woff2', '**/*.eot', '**/*.glsl'],

    plugins: [
      react({
        tsDecorators: true
      }),
      legacy({
        targets: ['> 0.2%, not dead', 'ie 11'], // 根据你的兼容需求调整；IE11 可删或加
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'] // 若使用 async/await
      }),
      createHtmlPlugin({
        inject: {
          data: {
            ...env,
            ASSETS_BASE_URL: env.VITE_ASSETS_BASE_URL || '',
            injectVConsole: /test|staging|main/.test(mode)
              ? /*html*/ `
              <script src="${env.VITE_ASSETS_BASE_URL || ''}/vconsole.min.js"></script>
              <script>window.vc = new window.VConsole();</script>
              <style>
                #__vconsole{
                display:none;
                }
              </style>
            `
              : /*html*/ `
              `,
            injectGUI: /dev|test|staging/.test(mode)
              ? `<script async src="${env.VITE_ASSETS_BASE_URL || ''}/dat.gui.min.js"></script>`
              : '',
            injectCrypto: `<script async src="${env.VITE_ASSETS_BASE_URL || ''}/crypto-js.min.js"></script>`
          }
        }
      }),
      // visualizer() as PluginOption,
      autoprefixer
    ],
    base: env.VITE_ASSETS_BASE_URL || '',
    resolve: {
      alias: {
        // 别名
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@views': fileURLToPath(new URL('./src/views', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@img': fileURLToPath(new URL('./src/assets/image', import.meta.url)),
        '@audio': fileURLToPath(new URL('./src/assets/audio', import.meta.url))
      }
    },

    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['legacy-js-api'],
          api: 'modern-compiler', // or "modern"
          additionalData: `@use 'sass:math'; @use './src/assets/scss/variables' as *;` // 全局scss
        }
      }
    },

    build: {
      assetsInlineLimit: 1024 * 2, // 降低内联资源大小限制
      chunkSizeWarningLimit: 1000, // 提高警告限制
      cssCodeSplit: true,
      target: 'es2015',

      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            pixi: [
              'pixi.js',
              '@pixi/sound',
              '@pixi/filter-color-matrix',
              '@pixi/ui',
              '@pixi-spine/all-3.8'
            ]
          }
        }
      }
    },
    server: {
      proxy: {
        '/axiom/api': {
          target: 'https://test-web.bluearchive-cn.com',
          changeOrigin: true
        }
      },
      hmr: {
        overlay: false
      }
    }
  }
})
