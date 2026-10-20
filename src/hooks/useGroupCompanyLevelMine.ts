import { computed, ref, unref, type Ref } from 'vue'
import type { FeatureCollection } from 'geojson'
import type { MenuOperation } from '@/utils/menuOperations'
import { fun } from '@/utils/menuOperations'

// ==================== 业务数据类型 ====================

/** 矿井点位数据(服务端 4694 消息) */
export interface MinePoint {
  id?: string
  name: string
  MineName?: string
  MineDesc?: string
  ProvinceID?: string
  /** 纬度 */
  B?: number
  /** 经度 */
  L?: number
  x?: number
  y?: number
  z?: number
  isonline?: number
  color?: string
  icon?: string
  isalarm?: number
  httpurl?: string
  vpnurl?: string
  [key: string]: unknown
}

/** 集团矿井层级信息(4694 响应) */
export interface GroupCompanyLevelMineData {
  data: MinePoint[]
  /** 服务端拼好的统计 HTML */
  total?: string
  contextmenuItems?: unknown
  columns?: unknown
  online?: number
  zoom?: number
  maxZoom?: number
  minZoom?: number
  [key: string]: unknown
}

/** 统计表格行(省份/集团/年份等过滤项) */
export interface StatRow {
  id: string
  name: string
  /** 对应查询参数字段,如 pid / gid / iid / year / ol */
  field: string
  [key: string]: unknown
}

/** 统计面板分组(5062 响应中的单个 Collapse 面板) */
export interface StatGroup {
  id: string
  name: string
  dataSource: StatRow[]
}

/** 通用项目统计(5062 响应) */
export interface CommonItemsStatData {
  data: StatGroup[]
  key?: string
  columns?: unknown
  [key: string]: unknown
}

/** 上下文菜单项(7594 响应) */
export interface ContextmenuEntry {
  menu: {
    /** 服务端下发时为函数名字符串,setContextmenuItems 后替换为具体函数 */
    operation: string | MenuOperation
    [key: string]: unknown
  }[]
  [key: string]: unknown
}

/** 上下文菜单原始消息(7594 响应,operation 为函数名字符串) */
export interface ContextmenuMessage {
  data: ContextmenuEntry[]
  type: string
}

/** 处理后存储的上下文菜单(operation 已替换为具体函数) */
export interface ContextmenuItemsData {
  menuItems: ContextmenuEntry[]
  type: string
}

/** 地理数据消息的通用包裹({ data: FeatureCollection }) */
export interface GeoJSONMessage {
  data: FeatureCollection
}

// ==================== 模块级状态(单例) ====================

const groupCompanyLevelMine = ref<GroupCompanyLevelMineData>()
const commonItemsStat = ref<CommonItemsStatData>()
const contextmenuItems = ref<ContextmenuItemsData>()
const tunnelGeoJSON = ref<FeatureCollection>()
const devicePointGeoJSON = ref<FeatureCollection>()
const groundHoleGeoJSON = ref<FeatureCollection>()
const waterAreaGeoJSON = ref<FeatureCollection>()
const traverseBoundary = ref<FeatureCollection>()

export function useGroupCompanyLevelMine() {
  // 设置函数
  function setGroupCompanyLevelMine(val: GroupCompanyLevelMineData) {
    groupCompanyLevelMine.value = val
  }

  function setCommonItemsStat(data: CommonItemsStatData) {
    commonItemsStat.value = data
  }

  function setContextmenuItems(val: ContextmenuMessage) {
    const { data, type } = val
    const menuItems = [...data]

    menuItems.forEach((e) => {
      const { menu } = e
      menu.forEach((t) => {
        t.operation = fun[t.operation as string]
      })
    })

    contextmenuItems.value = { menuItems, type }
  }

  function setGeoJSON(target: Ref<FeatureCollection | undefined>, val: GeoJSONMessage) {
    target.value = val.data
  }

  function setTunnelGeoJSON(val: GeoJSONMessage) {
    setGeoJSON(tunnelGeoJSON, val)
  }

  function setDevicePointGeoJSON(val: GeoJSONMessage) {
    setGeoJSON(devicePointGeoJSON, val)
  }

  function setGroundHoleGeoJSON(val: GeoJSONMessage) {
    setGeoJSON(groundHoleGeoJSON, val)
  }

  function setWaterAreaGeoJSON(val: GeoJSONMessage) {
    setGeoJSON(waterAreaGeoJSON, val)
  }

  function setTraverseBoundaryGeoJSON(val: GeoJSONMessage) {
    setGeoJSON(traverseBoundary, val)
  }

  // 计算属性
  const getGroupCompanyLevelMine = computed(() => unref(groupCompanyLevelMine))
  const getCommonItemsStat = computed(() => unref(commonItemsStat))
  const getContextmenuItems = computed(() => unref(contextmenuItems))
  const getTunnelGeoJSON = computed(() => unref(tunnelGeoJSON))
  const getDevicePointGeoJSON = computed(() => unref(devicePointGeoJSON))
  const getGroundHoleGeoJSON = computed(() => unref(groundHoleGeoJSON))
  const getWaterAreaGeoJSON = computed(() => unref(waterAreaGeoJSON))
  const getTraverseBoundaryGeoJSON = computed(() => unref(traverseBoundary))

  return {
    setGroupCompanyLevelMine,
    setCommonItemsStat,
    setContextmenuItems,
    setTunnelGeoJSON,
    setDevicePointGeoJSON,
    setGroundHoleGeoJSON,
    setWaterAreaGeoJSON,
    setTraverseBoundaryGeoJSON,

    getGroupCompanyLevelMine,
    getCommonItemsStat,
    getContextmenuItems,
    getTunnelGeoJSON,
    getDevicePointGeoJSON,
    getGroundHoleGeoJSON,
    getWaterAreaGeoJSON,
    getTraverseBoundaryGeoJSON,
  }
}
