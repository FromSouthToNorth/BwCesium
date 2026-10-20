/**
 * 巷道模型转换结果缓存
 *
 * OBJ→glTF 转换（纹理重编码）耗时较长，将转换出的 glb 持久化到 IndexedDB，
 * 再次勾选或刷新页面后直接复用。生产环境为 http 源，Cache API 不可用，故用 IndexedDB。
 * 缓存层任何异常都不阻断模型加载，仅退化为每次现算。
 */
import type { TunnelFootprint } from './objToGltf'

export interface ConvertedModel {
  /** glb blob URL，使用完毕后需 URL.revokeObjectURL 释放 */
  url: string
  /** 模型水平足迹，用于运行时自动配准（旧缓存可能为空） */
  footprint: TunnelFootprint | null
}

const DB_NAME = 'bwcesium-model-cache'
const STORE_NAME = 'glb'
// 转换产物结构变化时递增，使旧缓存自然失效
const CACHE_VERSION = 'v3'
// HEAD 不可用或服务端不返回校验头时，退化为按时间失效
const CACHE_TTL = 24 * 60 * 60 * 1000
// 校验服务端文件是否有变化的 HEAD 请求超时
const HEAD_TIMEOUT = 2500

interface CacheRecord {
  etag: string | null
  contentLength: string | null
  savedAt: number
  glb: Blob
  footprint: TunnelFootprint | null
}

interface ServerSignature {
  etag: string | null
  contentLength: string | null
}

// 同一模型的并发请求共享同一份转换任务
const inflight = new Map<string, Promise<ConvertedModel>>()

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE_NAME))
        open.result.createObjectStore(STORE_NAME)
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  try {
    return await reqAsPromise(run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)))
  } finally {
    db.close()
  }
}

/**
 * 探测服务端文件的校验头，失败返回 null
 */
async function fetchSignature(url: string): Promise<ServerSignature | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT)
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return { etag: res.headers.get('etag'), contentLength: res.headers.get('content-length') }
  } catch {
    return null
  }
}

async function readCache(objUrl: string, key: string): Promise<ConvertedModel | null> {
  const record = await withStore(
    'readonly',
    (store) => store.get(key) as IDBRequest<CacheRecord | undefined>,
  )
  if (!record?.glb) return null

  const signature = await fetchSignature(objUrl)
  if (signature && (signature.etag || signature.contentLength)) {
    // 服务端可校验：以校验头为准
    if (signature.etag !== null && signature.etag !== record.etag) return null
    if (signature.contentLength !== null && signature.contentLength !== record.contentLength)
      return null
  } else if (Date.now() - record.savedAt > CACHE_TTL) {
    // HEAD 不可用或不带校验头：按时间失效
    return null
  }
  return { url: URL.createObjectURL(record.glb), footprint: record.footprint ?? null }
}

async function writeCache(
  key: string,
  objUrl: string,
  glb: Blob,
  footprint: TunnelFootprint | null,
): Promise<void> {
  const signature = await fetchSignature(objUrl)
  const record: CacheRecord = {
    etag: signature?.etag ?? null,
    contentLength: signature?.contentLength ?? null,
    savedAt: Date.now(),
    glb,
    footprint,
  }
  await withStore('readwrite', (store) => store.put(record, key))
}

/**
 * 获取巷道模型的 glb blob URL：命中缓存直接返回，否则现算并写入缓存
 * @param {string} objUrl - OBJ 模型地址（缓存 key 的一部分）
 * @param {string} mtlUrl - MTL 材质地址（缓存 key 的一部分）
 * @param {() => Promise<ConvertedModel>} convert - 缓存未命中时执行的转换函数
 * @returns {Promise<ConvertedModel>} glb blob URL 与模型足迹
 */
export function getConvertedModelUrl(
  objUrl: string,
  mtlUrl: string,
  convert: () => Promise<ConvertedModel>,
): Promise<ConvertedModel> {
  const key = `${CACHE_VERSION}|${objUrl}|${mtlUrl}`
  const pending = inflight.get(key)
  if (pending) return pending

  const task = (async () => {
    try {
      const cached = await readCache(objUrl, key)
      if (cached) {
        console.log('---巷道模型命中缓存---')
        return cached
      }
    } catch (error) {
      console.warn('读取巷道模型缓存失败，转为直接加载:', error)
    }

    const converted = await convert()
    try {
      const res = await fetch(converted.url)
      await writeCache(key, objUrl, await res.blob(), converted.footprint)
    } catch (error) {
      console.warn('写入巷道模型缓存失败:', error)
    }
    return converted
  })().finally(() => inflight.delete(key))

  inflight.set(key, task)
  return task
}
