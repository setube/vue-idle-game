/**
 * IndexedDB 工具函数
 * 提供创建、打开和操作IndexedDB数据库的通用方法
 */

/**
 * 初始化数据库结构
 * @param {IDBDatabase} db - 数据库实例
 * @param {number} oldVersion - 旧版本号
 * @param {number} newVersion - 新版本号
 */
export const initDatabase = (db, oldVersion, newVersion) => {
  // 版本1的初始化
  if (oldVersion < 1) {
    // 创建游戏状态存储
    const gameStateStore = db.createObjectStore('gameState', { keyPath: 'id' })
    // 创建设置存储
    db.createObjectStore('settings', { keyPath: 'id' })
    // 创建索引
    gameStateStore.createIndex('lastUpdated', 'lastUpdated', { unique: false })
  }
  // 版本1到版本2的升级
  // 检查settings对象存储是否存在，不存在则创建
  if (oldVersion < 2 && newVersion >= 2 && !db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' })
  // 版本2到版本3的升级
  if (oldVersion < 3) {
    // 创建技能、商店、事件、成就、每日任务和通知存储
    if (!db.objectStoreNames.contains('skills')) db.createObjectStore('skills', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('shop')) db.createObjectStore('shop', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('dailyTasks')) db.createObjectStore('dailyTasks', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' })
  }
  // 版本3到版本4的升级 - 添加宠物系统
  // 创建宠物存储
  if (oldVersion < 4 && !db.objectStoreNames.contains('pets')) db.createObjectStore('pets', { keyPath: 'id' })
}

/**
 * 打开数据库
 * @param {string} name - 数据库名称
 * @param {number} version - 数据库版本
 * @param {Function} upgradeCallback - 数据库升级回调函数
 * @returns {Promise<Object>} - 返回增强后的数据库对象
 */
export const openDB = (name, version, upgradeCallback) => {
  return new Promise((resolve, reject) => {
    // 打开数据库连接
    const request = indexedDB.open(name, version)
    // 数据库打开成功
    request.onsuccess = (event) => {
      const db = event.target.result
      // 使用enhanceDB增强数据库对象
      resolve(enhanceDB(db))
    }
    // 数据库打开失败
    request.onerror = (event) => reject(event.target.error)
    // 数据库需要升级
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      const oldVersion = event.oldVersion
      // 如果提供了升级回调，则调用
      if (upgradeCallback) upgradeCallback(db, oldVersion, version)
      // 否则使用默认的初始化函数
      else initDatabase(db, oldVersion, version)
    }
  })
}

/**
 * 删除数据库
 * @param {string} name - 数据库名称
 * @returns {Promise<void>}
 */
export const deleteDB = (name) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = (event) => {
      console.error('删除数据库失败:', event.target.error)
      reject(event.target.error)
    }
  })
}

/**
 * 扩展IDBDatabase对象，添加常用操作方法
 * @param {IDBDatabase} db - 数据库实例
 * @returns {Object} - 扩展后的数据库对象
 */
export const enhanceDB = (db) => {
  return {
    // 原始数据库对象
    _db: db,
    // 创建事务
    transaction (storeName, mode) {
      return db.transaction(storeName, mode);
    },
    // 获取单个记录
    get (storeName, key) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = (event) => reject(event.target.error)
      })
    },
    // 获取所有记录
    getAll (storeName, query, count) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll(query, count)
        request.onsuccess = () => resolve(request.result)
        request.onerror = (event) => reject(event.target.error)
      })
    },
    // 添加记录
    add (storeName, item) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.add(item)
        request.onsuccess = () => resolve(request.result)
        request.onerror = (event) => reject(event.target.error)
      })
    },
    // 更新记录
    put (storeName, item) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put(item)
        request.onsuccess = () => resolve(request.result)
        request.onerror = (event) => reject(event.target.error)
      })
    },
    // 删除记录
    delete (storeName, key) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = (event) => reject(event.target.error)
      })
    },
    // 清空对象仓库
    clear (storeName) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = (event) => reject(event.target.error)
      })
    },
    // 关闭数据库连接
    close () {
      db.close()
    }
  }
}