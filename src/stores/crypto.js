import CryptoJS from 'crypto-js'

// 数据加密
export function encryptData (data) {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), 'vue-idle-game').toString()
  } catch (error) {
    console.error('数据加密失败:', error)
    return null
  }
}

// 数据解密
export function decryptData (encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, 'vue-idle-game')
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  } catch (error) {
    console.error('数据解密失败:', error)
    return null
  }
}