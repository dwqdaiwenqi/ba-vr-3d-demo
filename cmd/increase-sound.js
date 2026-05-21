const { exec } = require('child_process')
const path = require('path')

const AUDIO_DIR = path.resolve(__dirname, '../src/assets/audio')
const FILES = ['miss.mp3', 'start.mp3', 'end.mp3']

const VOLUME_FACTOR = 1.75

function runFfmpeg(inputPath, outputPath, factor) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i "${inputPath}" -filter:a "volume=${factor}" "${outputPath}"`

    console.log('\n执行命令:')
    console.log(cmd)

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`处理 ${path.basename(inputPath)} 出错:`, error.message)
        console.error(stderr)
        reject(error)
        return
      }
      console.log(`处理完成: ${outputPath}`)
      resolve()
    })
  })
}

;(async () => {
  try {
    for (const file of FILES) {
      const input = path.join(AUDIO_DIR, file)
      const extIndex = file.lastIndexOf('.') // 生成 miss_vol1.5.mp3 这种
      const base = extIndex > -1 ? file.slice(0, extIndex) : file
      const ext = extIndex > -1 ? file.slice(extIndex) : '.mp3'
      const output = path.join(AUDIO_DIR, `${base}_vol_x${VOLUME_FACTOR}_${ext}`)

      await runFfmpeg(input, output, VOLUME_FACTOR)
    }

    console.log('\n全部音频处理完成！')
  } catch (e) {
    console.error('\n批量处理失败:', e)
    process.exit(1)
  }
})()
