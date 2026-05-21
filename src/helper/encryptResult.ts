export default function encryptResult(
  result: { score: number; combo: number },
  encryptBase64: string
): string {
  const { CryptoJS } = window
  const decodedStr = atob(encryptBase64)
  const { key: keyHex, iv: ivHex } = JSON.parse(decodedStr)

  const key = CryptoJS.enc.Hex.parse(keyHex)
  const iv = CryptoJS.enc.Hex.parse(ivHex)

  const payloadToEncrypt = { result: result }

  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payloadToEncrypt), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  const base64Result = encrypted.ciphertext.toString(CryptoJS.enc.Base64)

  return base64Result
}
