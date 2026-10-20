/**
 * OBJ+MTL 运行时转换为 glTF blob URL 工具
 *
 * Cesium 原生只支持 glTF/GLB，服务端巷道模型为 OBJ 格式，
 * 用 three 的加载器转换后以 blob URL 交给 Cesium。
 * three 体积较大，全部动态引入，仅在首次加载巷道模型时才下载。
 *
 * 针对巷道类 OBJ（材质上千但唯一贴图极少、几何碎）的两项关键优化：
 * 1. 纹理按 URL 复用——MTL 中上千个材质常引用同一张贴图，若不复用，
 *    GLTFExporter 按 Texture 对象判重，同一图片会被重复编码嵌入 glb 上千次；
 * 2. 几何按材质签名合并——OBJLoader 按 usemtl 切片生成海量微小 Mesh，
 *    逐个导出会让 Cesium 产生同等数量的 draw command，相机移动时帧率骤降。
 */
import type * as THREE from 'three'

// 纹理等待兜底上限，防止个别纹理挂起导致整体永远不返回
const TEXTURE_WAIT_TIMEOUT = 10_000

// 需要检查就绪状态的贴图槽位
const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'specularMap',
  'emissiveMap',
  'aoMap',
  'alphaMap',
  'roughnessMap',
  'metalnessMap',
  'bumpMap',
]

/**
 * 按 URL 复用 Texture 实例的加载器，挂到 LoadingManager 上供 MTLLoader 调用
 */
function createCachedTextureLoader(THREE_NS: typeof THREE, cache: Map<string, THREE.Texture>) {
  return class extends THREE_NS.Loader {
    load(
      url: string,
      onLoad?: (data: unknown) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (err: unknown) => void,
    ) {
      const hit = cache.get(url)
      if (hit) {
        // 已有实例：异步回调，保持加载器接口语义
        queueMicrotask(() => onLoad?.(hit))
        return hit
      }
      const texture = new THREE_NS.TextureLoader(this.manager).load(
        url,
        onLoad,
        onProgress,
        onError,
      )
      cache.set(url, texture)
      return texture
    }
  }
}

/**
 * 将 OBJ+MTL 转换为二进制 glTF 的 blob URL
 * @param {string} objUrl - OBJ 模型地址
 * @param {string} mtlUrl - MTL 材质地址（引用的纹理按 OBJ 所在目录解析）
 * @param {number} maxTextureSize - 导出贴图的最大边长，超过会等比缩小（canvas 重编码耗时随像素数增长）
 * @returns {Promise<string>} glb blob URL，使用完毕后需 URL.revokeObjectURL 释放
 */
export async function convertObjToGltfBlobUrl(
  objUrl: string,
  mtlUrl: string,
  maxTextureSize = 2048,
): Promise<string> {
  const [THREE, { MTLLoader }, { OBJLoader }, { GLTFExporter }, { mergeGeometries }] =
    await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/MTLLoader.js'),
      import('three/examples/jsm/loaders/OBJLoader.js'),
      import('three/examples/jsm/exporters/GLTFExporter.js'),
      import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    ])

  const manager = new THREE.LoadingManager()
  const textureCache = new Map<string, THREE.Texture>()
  manager.addHandler(
    /\.(jpe?g|png|bmp|gif|webp|tga)$/i,
    new (createCachedTextureLoader(THREE, textureCache))(),
  )

  const mtlLoader = new MTLLoader(manager)
  // MTL 引用的纹理与 OBJ 同目录，走同一个代理地址
  mtlLoader.setResourcePath(new URL('.', new URL(objUrl, location.href)).href)

  const materials = await mtlLoader.loadAsync(mtlUrl)
  materials.preload()

  // MTL 文件本身此刻已加载完成，preload 排队的纹理最早也要到下一个宏任务才可能结束，
  // 此时再挂 onLoad 不会被 MTL 文件的完成信号提前误触发
  const texturesReady = new Promise<void>((resolve) => {
    manager.onLoad = () => resolve()
  })
  manager.onError = (url) => console.warn(`巷道模型资源加载失败: ${url}`)

  const group = await new OBJLoader(manager).setMaterials(materials).loadAsync(objUrl)

  await Promise.race([
    texturesReady,
    new Promise((resolve) => setTimeout(resolve, TEXTURE_WAIT_TIMEOUT)),
  ])

  // 未就绪的贴图槽位置空，避免导出阶段因单张贴图缺失整体报错
  group.traverse((obj: THREE.Object3D) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    mats.forEach((mat) => {
      const target = mat as unknown as Record<string, THREE.Texture | null>
      TEXTURE_SLOTS.forEach((slot) => {
        if (target[slot] && !target[slot]!.image) target[slot] = null
      })
    })
  })

  const mergedGroup = mergeMeshesByMaterial(THREE, group, mergeGeometries, textureCache.size)

  const exporter = new GLTFExporter()
  console.time('---巷道模型 OBJ 转 glTF 耗时---')
  const glb = await exporter.parseAsync(mergedGroup, { binary: true, maxTextureSize })
  console.timeEnd('---巷道模型 OBJ 转 glTF 耗时---')
  return URL.createObjectURL(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }))
}

/**
 * 按材质签名合并网格，大幅减少导出后的节点与 draw command 数量
 * 签名包含贴图与影响外观的基础属性，只有外观完全一致的网格才会被合并
 */
function mergeMeshesByMaterial(
  THREE_NS: typeof THREE,
  group: THREE.Group,
  mergeGeometries: (
    geometries: THREE.BufferGeometry[],
    useGroups?: boolean,
  ) => THREE.BufferGeometry | null,
  textureCount: number,
): THREE.Group {
  const meshes: THREE.Mesh[] = []
  group.updateMatrixWorld(true)
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh)
  })

  const signatureOf = (mat: THREE.MeshPhongMaterial) =>
    `${mat.map?.uuid ?? 'none'}|${mat.color.getHexString()}|${mat.specular?.getHexString() ?? ''}|` +
    `${mat.shininess ?? ''}|${mat.opacity}|${mat.transparent}|${mat.side}`

  const IDENTITY = new THREE_NS.Matrix4()
  const buckets = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >()
  const leftovers: THREE.Object3D[] = []
  const materialSet = new Set<THREE.Material>()

  meshes.forEach((mesh) => {
    // 多材质网格无法按单一签名合并，原样保留
    if (Array.isArray(mesh.material)) {
      leftovers.push(mesh)
      return
    }
    materialSet.add(mesh.material)

    let geom = mesh.geometry
    // 非单位变换先烘焙进顶点；统计口径下 OBJ 网格基本都在原点，clone 仅在需要时发生
    if (!mesh.matrixWorld.equals(IDENTITY)) {
      geom = geom.clone().applyMatrix4(mesh.matrixWorld)
    }
    // mergeGeometries 要求所有几何索引状态与属性集一致
    if (geom.index) geom = geom.toNonIndexed()
    if (!geom.attributes.normal) geom.computeVertexNormals()
    if (!geom.attributes.uv) {
      geom.setAttribute(
        'uv',
        new THREE_NS.Float32BufferAttribute(
          new Float32Array(geom.attributes.position.count * 2),
          2,
        ),
      )
    }

    const sig = signatureOf(mesh.material as THREE.MeshPhongMaterial)
    const bucket = buckets.get(sig)
    if (bucket) {
      bucket.geometries.push(geom)
    } else {
      buckets.set(sig, { material: mesh.material, geometries: [geom] })
    }
  })

  const mergedGroup = new THREE_NS.Group()
  let mergedCount = 0
  buckets.forEach((bucket, sig) => {
    const merged = mergeGeometries(bucket.geometries, false)
    if (merged) {
      mergedGroup.add(new THREE_NS.Mesh(merged, bucket.material))
      mergedCount++
    } else {
      console.warn('巷道模型网格合并失败，该组按原始网格导出:', sig)
      bucket.geometries.forEach((geom) => {
        mergedGroup.add(new THREE_NS.Mesh(geom, bucket.material))
        mergedCount++
      })
    }
  })
  leftovers.forEach((mesh) => mergedGroup.add(mesh))
  mergedCount += leftovers.length

  console.log(
    `---巷道模型优化: 网格 ${meshes.length} → ${mergedCount}, 材质 ${materialSet.size} → ${buckets.size}, 唯一贴图 ${textureCount} 张---`,
  )
  return mergedGroup
}
