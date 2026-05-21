#!/usr/bin/env node
// cmd/convert-mp3.js
// Usage example:
//   node cmd/convert-mp3.js --inDir=cmd/audio --outDir=./src/assets/audio --bitrate=128k --concurrency=4 --overwrite

const { spawn } = require('child_process')
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    inDir: 'cmd/audio',
    outDir: './src/assets/audio',
    bitrate: '128k',
    concurrency: 4,
    overwrite: false,
    ext: '.mp3'
  }
  for (let a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      const key = k.replace(/^--/, '')
      if (key === 'inDir' || key === 'indir' || key === 'input') opts.inDir = v || args[++i]
      else if (key === 'outDir' || key === 'outdir' || key === 'out') opts.outDir = v || args[++i]
      else if (key === 'bitrate') opts.bitrate = v || args[++i]
      else if (key === 'concurrency') opts.concurrency = parseInt(v || args[++i], 10) || 4
      else if (key === 'overwrite') opts.overwrite = v === 'true' || v === undefined
      else if (key === 'ext') opts.ext = v || args[++i]
      else if (key === 'help' || key === 'h') {
        console.log(
          'Usage: node cmd/convert-mp3.js --inDir=cmd/audio --outDir=src/assets/audio --bitrate=128k --concurrency=4 --overwrite'
        )
        process.exit(0)
      }
    }
  }
  return opts
}

async function collectFiles(dir) {
  const out = []
  async function walk(d) {
    let list
    try {
      list = await fs.readdir(d, { withFileTypes: true })
    } catch (err) {
      return
    }
    for (const ent of list) {
      const full = path.join(d, ent.name)
      if (ent.isDirectory()) {
        await walk(full)
      } else if (ent.isFile()) {
        out.push(full)
      }
    }
  }
  await walk(dir)
  return out
}

function ffmpegExists() {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version'])
    p.on('error', () => resolve(false))
    p.on('close', (code) => resolve(code === 0 || code === 1))
  })
}

function spawnFfmpegConvert(inPath, outPath, bitrate) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', inPath, '-c:a', 'libmp3lame', '-b:a', bitrate, outPath]
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    p.stderr.on('data', (c) => (stderr += c.toString()))
    p.on('error', (e) => reject(e))
    p.on('close', (code) => {
      if (code === 0) resolve(outPath)
      else reject(new Error(`ffmpeg exited ${code}\n${stderr}`))
    })
  })
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
}

async function copyFile(src, dst) {
  await ensureDir(path.dirname(dst))
  return fs.copyFile(src, dst)
}

async function main() {
  const opts = parseArgs()
  const srcRoot = path.resolve(opts.inDir)
  const dstRoot = path.resolve(opts.outDir)
  console.log(`source: ${srcRoot}`)
  console.log(`dest:   ${dstRoot}`)
  console.log(
    `bitrate: ${opts.bitrate}, concurrency: ${opts.concurrency}, overwrite: ${opts.overwrite}`
  )

  const ok = await ffmpegExists()
  if (!ok) {
    console.error('ffmpeg not found in PATH. Please install ffmpeg and ensure it is available.')
    process.exit(2)
  }

  const allFiles = await collectFiles(srcRoot)
  const wavs = allFiles.filter((f) => f.toLowerCase().endsWith('.wav'))
  const others = allFiles.filter((f) => !f.toLowerCase().endsWith('.wav'))

  const tasks = []

  // wav -> mp3
  for (const f of wavs) {
    const rel = path.relative(srcRoot, f)
    const outRel = rel.replace(/\.[^.]+$/, opts.ext.startsWith('.') ? opts.ext : '.' + opts.ext)
    const outPath = path.join(dstRoot, outRel)
    tasks.push({ type: 'convert', in: f, out: outPath })
  }
  // other files -> copy
  for (const f of others) {
    const rel = path.relative(srcRoot, f)
    const outPath = path.join(dstRoot, rel)
    tasks.push({ type: 'copy', in: f, out: outPath })
  }

  // ensure all output dirs
  const outDirs = new Set(tasks.map((t) => path.dirname(t.out)))
  for (const d of outDirs) await ensureDir(d)

  let idx = 0
  let okCount = 0
  let failCount = 0

  const concurrency = Math.max(1, opts.concurrency || 4)
  const queue = tasks.slice()

  const workers = new Array(concurrency).fill(null).map(async (_, wid) => {
    while (true) {
      const task = queue.shift()
      if (!task) break
      idx++
      const name = path.basename(task.in)
      try {
        const exists = fsSync.existsSync(task.out)
        if (exists && !opts.overwrite) {
          console.log(`[W${wid}] SKIP  ${name} -> already exists`)
          okCount++
          continue
        }

        if (task.type === 'convert') {
          process.stdout.write(
            `[W${wid}] CONV  ${name} -> ${path.relative(process.cwd(), task.out)}\n`
          )
          await spawnFfmpegConvert(task.in, task.out, opts.bitrate)
          console.log(`[W${wid}] OK    ${name}`)
          okCount++
        } else {
          process.stdout.write(
            `[W${wid}] COPY  ${name} -> ${path.relative(process.cwd(), task.out)}\n`
          )
          await copyFile(task.in, task.out)
          console.log(`[W${wid}] OK    ${name}`)
          okCount++
        }
      } catch (e) {
        failCount++
        console.error(`[W${wid}] ERR   ${name}: ${e.message}`)
      }
    }
  })

  await Promise.all(workers)

  console.log(`\nFinished. total: ${tasks.length}, ok: ${okCount}, failed: ${failCount}`)
  if (failCount > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
