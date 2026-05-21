// // @ts-nocheck
// export function encrypt(data: string, k32: string, iv16: string) {
//   const key = CryptoJS.enc.Utf8.parse(k32)
//   const iv = CryptoJS.enc.Utf8.parse(iv16)
//   return CryptoJS.AES.encrypt(data, key, {
//     iv,
//     mode: CryptoJS.mode.CBC
//   }).toString(CryptoJS.format.Hex)
// }

const desCipherInfo = (info: string) => {
  const key = info.substring(0, 32)
  const iv = info.substring(32)
  return { key, iv }
}
/**
 * 加密信息
 * @param {any} data - 加密数据
 * @param {string} cipherInfo - 密码信息
 * @returns {string} 密文字符串(hex格式)
 */
export const encrypt = (data: { score: number }, cipherInfo: string) => {
  const { key, iv } = desCipherInfo(cipherInfo)

  const message = JSON.stringify(data)

  // 创建WordArray对象，直接使用UTF-8编码的key和iv
  // 这与Node.js中直接使用字符串作为key和iv的行为一致
  const keyWordArray = window.CryptoJS.enc.Utf8.parse(key)
  const ivWordArray = window.CryptoJS.enc.Utf8.parse(iv)

  // 使用window.CryptoJS实现与Node.js crypto.createCipheriv相同的加密
  const encrypted = window.CryptoJS.AES.encrypt(message, keyWordArray, {
    iv: ivWordArray,
    mode: window.CryptoJS.mode.CBC,
    padding: window.CryptoJS.pad.Pkcs7
  })

  // 转换为hex字符串，与Node.js的toString('hex')等效
  return encrypted.ciphertext.toString(window.CryptoJS.enc.Hex)
}
