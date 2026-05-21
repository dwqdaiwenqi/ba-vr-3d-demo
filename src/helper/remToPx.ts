export default function remToPx(remValue: string) {
  // 提取数值部分
  const value = parseFloat(remValue)

  // 检查是否为有效数字
  if (isNaN(value)) {
    throw new Error(`Invalid rem value: ${remValue}`)
  }

  // 获取根元素的计算字体大小（默认单位为 px）
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)

  // 计算并返回 px 值
  return value * rootFontSize
}
