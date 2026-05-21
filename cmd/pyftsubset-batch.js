// #!/usr/bin/env node
// cmd/pyftsubset-batch.js
// 批量读取 build-font.config.js 的 fontData，分别用 pyftsubset 生成子集
// 运行示例：
// node cmd/pyftsubset-batch.js --flavor=woff2 --extra="哈哈哈aaa" --outDir=./src/assets/fonts
// node cmd/pyftsubset-batch.js  --outDir=./src/assets/fonts
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

const common = [
  '©∞',
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`"\'"\'_-~=+\\|/()[][]{}<>.,;:!^%#@$&?*.',
  'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ１２３４５６７８９０｀”’“‘＿－～＝＋＼｜／（）［］【】｛｝＜＞．，；：！＾％＃＠＄＆？＊。',
  ' '
]

// const mainTextEN = require('../src/i18n/en.json')
// const dialogTextEN = require('../src/i18n/dialog.en.json')

// const allTextEN = [JSON.stringify(mainTextEN), JSON.stringify(dialogTextEN)]

const text = require('../src/i18n/cn.json')

const allText = [JSON.stringify(text)]

const cfg = {
  destFontDir: './src/assets/font',
  fontData: {
    // 'SourceHanSansCN-Regular_CN': [...common, ...allTextEN]
    qx: [...common, ...allText],
    Pattaya: [...common, ...allText],
    'SourceHanSerifSC-Medium': [...common, ...allText]
  }
}

const fontSrcMap = {
  qx: './cmd/qx.ttf',
  Pattaya: './cmd/Pattaya.ttf',
  'SourceHanSerifSC-Medium': './cmd/SourceHanSerifSC-Medium.otf'
}

///////////////////////////////////////////////////

// 支持 --key=value、--key value、以及布尔 flag 的参数解析
function parseArgs() {
  const argv = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const w = a.slice(2)
    if (w.includes('=')) {
      const [k, v] = w.split(/=(.+)/, 2)
      out[k] = v
    } else {
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        out[w] = next
        i++
      } else {
        out[w] = 'true'
      }
    }
  }
  return out
}

// 递归收集字符串
function collectStrings(value, collector) {
  if (value == null) return
  if (typeof value === 'string') {
    collector.push(value)
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, collector))
  } else if (typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, collector))
  }
}

// 运行 pyftsubset
async function runSubset({ fontPath, textFile, outFile, flavor }) {
  const args = [
    fontPath,
    `--text-file=${textFile}`,
    `--output-file=${outFile}`,
    '--layout-features=*',
    '--no-hinting'
  ]
  if (flavor) args.push(`--flavor=${flavor}`)

  const { stdout, stderr } = await execFileAsync('pyftsubset', args, {
    maxBuffer: 16 * 1024 * 1024
  })
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)
}

// 主逻辑
;(async () => {
  try {
    const args = parseArgs()
    const flavor = args.flavor || '' //
    const extraText = args.extra || '' // 额外字符，如 "哈哈哈aaa"
    const outDir = args.outDir || null // 覆盖输出目录，默认用 config.destFontDir

    const results = []
    for (const key of Object.keys(cfg.fontData)) {
      const srcRel = fontSrcMap[key]
      const srcAbs = srcRel ? path.resolve(srcRel) : null
      if (!srcAbs || !fs.existsSync(srcAbs)) {
        console.warn(`[跳过] 找不到源字体，key=${key}，期望路径=${srcRel}`)
        continue
      }

      // 收集字符：来自 common + i18n（你的 config 已经把 JSON.stringify 放进数组）
      const strings = []
      collectStrings(cfg.fontData[key], strings)
      if (extraText) strings.push(extraText)

      const joined = strings.join('')
      const charSet = new Set()
      for (const ch of joined) charSet.add(ch)
      const chars = Array.from(charSet).join('')

      // 写入独立 chars 文件（便于调试、重复执行不覆盖）
      const safeKey = key.replace(/[^\w.-]/g, '_')
      const charsFile = path.resolve(__dirname, `chars-${safeKey}.txt`)
      fs.writeFileSync(charsFile, chars, 'utf8')

      // 输出文件名与目录
      const destBaseDir = path.resolve(outDir || cfg.destFontDir || './src/assets/fonts')
      if (!fs.existsSync(destBaseDir)) fs.mkdirSync(destBaseDir, { recursive: true })

      const ext = flavor ? flavor.toLowerCase() : path.extname(srcAbs).slice(1) || 'otf'
      const outFile = path.join(destBaseDir, `${key}.${ext}`)

      console.log(`\n[生成] ${key}`)
      console.log(`源字体: ${srcAbs}`)
      console.log(`字符数: ${chars.length}`)
      console.log(`chars : ${charsFile}`)
      console.log(`输出至: ${outFile}`)
      console.log(`flavor: ${flavor || '(原格式)'}`)

      await runSubset({
        fontPath: srcAbs,
        textFile: charsFile,
        outFile,
        flavor
      })

      results.push(outFile)
    }

    if (results.length === 0) {
      console.warn('未生成任何子集，请检查源字体路径映射 fontSrcMap 是否正确。')
      process.exit(2)
    } else {
      console.log('\n全部完成：')
      results.forEach((p) => console.log(' -', p))
    }
  } catch (err) {
    console.error('执行失败：', err.message || err)
    process.exit(3)
  }
})()
