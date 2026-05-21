#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 检查cwebp是否已安装
try {
  execSync('cwebp -version', { stdio: 'ignore' })
} catch (e) {
  console.error('请先安装cwebp工具:')
  console.error('macOS: brew install webp')
  console.error('Linux: apt-get install webp 或 yum install libwebp-tools')
  console.error('Windows: 从 https://developers.google.com/speed/webp/download 下载')
  process.exit(1)
}

// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp']

// 输入目录
const INPUT_DIR = 'src/assets/image'

// 检查输入目录是否存在
if (!fs.existsSync(INPUT_DIR)) {
  console.error(`错误: 目录 ${INPUT_DIR} 不存在`)
  process.exit(1)
}

// 递归查找所有图片文件
const findImageFiles = (dir) => {
  let imageFiles = []

  const scanDirectory = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    entries.forEach((entry) => {
      const entryPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        scanDirectory(entryPath)
      } else {
        const ext = path.extname(entry.name).toLowerCase()
        if (IMAGE_EXTENSIONS.includes(ext)) {
          imageFiles.push(entryPath)
        }
      }
    })
  }

  scanDirectory(dir)
  return imageFiles
}

// 转换单个图片
const convertToWebp = (inputFile, outputFile, quality = 80) => {
  try {
    // 执行cwebp命令
    execSync(`cwebp -q ${quality} "${inputFile}" -o "${outputFile}"`, { stdio: 'inherit' })
    console.log(`转换成功: ${inputFile} -> ${outputFile}`)
    return true
  } catch (error) {
    console.error(`转换失败: ${inputFile}`, error.message)
    return false
  }
}

// 主函数
const main = () => {
  const imageFiles = findImageFiles(INPUT_DIR)
  const quality = process.argv[2] || 80 // 可选的质量参数

  console.log(`找到 ${imageFiles.length} 个图片文件需要转换`)

  let successCount = 0
  let failCount = 0

  imageFiles.forEach((inputFile) => {
    const inputDir = path.dirname(inputFile)
    const fileName = path.basename(inputFile, path.extname(inputFile))
    const outputFile = path.join(inputDir, `${fileName}.webp`)

    if (convertToWebp(inputFile, outputFile, quality)) {
      successCount++
    } else {
      failCount++
    }
  })

  console.log(`\n转换完成: 成功 ${successCount} 个, 失败 ${failCount} 个`)
}

// 执行主函数
main()
