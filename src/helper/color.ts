export function hexToRgb(hex: number) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return { r, g, b }
}

export function rgbToHex(r: number, g: number, b: number) {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}
