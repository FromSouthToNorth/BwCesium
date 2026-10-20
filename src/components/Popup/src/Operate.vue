<script setup lang="ts">
import { ref, toRaw, watch, unref, onMounted } from 'vue'
import { Checkbox, Tree } from 'ant-design-vue'
import {
  traverseBoundaryClipping,
  loadMineDevicePoint,
  loadMineTunnel,
  loadMineTunnelModel,
  loadMineGroundHole,
  loaMineWaterArea,
} from '@/utils/cesium'
import { forEach } from 'lodash-es'

const props = defineProps({
  mine: { type: Object as any, default: () => ({}) },
  initialCheckedKeys: {
    type: Array as any,
    default: () => [],
  },
  showModal: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['checkedKeysChange'])

const cut = ref(false)
const tunnel = ref(false)
const tunnelModel = ref(false)
const safe = ref(false)
const hole = ref(false)
const water = ref(false)
const mineInfo = ref<any>(null)
const checkedKeys = ref(props.initialCheckedKeys || [])

/** 当前生效的矿井名:变化时驱动各开关 watcher 对新矿井重放当前状态 */
const activeMineName = ref('')

// 按勾选 keys 同步各数据开关,开关 watcher 负责加载/清除对应地图效果
function applyKeysToBuilds(keys: (string | number)[]) {
  const set = new Set(keys)
  cut.value = set.has('0-0-0')
  tunnel.value = set.has('0-0-1')
  safe.value = set.has('0-0-3')
  hole.value = set.has('0-0-4')
  water.value = set.has('0-0-5')
  tunnelModel.value = set.has('0-1-1')
}

// 以外部保存的勾选状态为准重新绑定,并同步各开关,保证勾选框与地图效果一致
function rebindState() {
  checkedKeys.value = [...(props.initialCheckedKeys || [])]
  applyKeysToBuilds(checkedKeys.value)
}

watch(
  () => unref(props.mine)?.name,
  (name) => {
    if (name !== activeMineName.value) {
      // 只有矿山名称变化时才重绑;弹窗开着时点击相同矿井不改任何状态
      activeMineName.value = name ?? ''
      rebindState()
    }
    // 如果矿山名称相同,保留现有状态
  },
)

// 弹窗每次重新打开(false→true)时重绑状态
watch(
  () => props.showModal,
  (val) => {
    if (val) rebindState()
  },
)

watch([cut, activeMineName], ([val]) => {
  console.log('裁切: ', val)
  traverseBoundaryClipping(toRaw(props.mine), val)
})

watch([tunnel, activeMineName], ([val]) => {
  console.log('巷道: ', val)
  loadMineTunnel(toRaw(props.mine), 'tunnel_LineString', val)
})

watch([tunnelModel, activeMineName], ([val]) => {
  console.log('巷道模型: ', val)
  loadMineTunnelModel(toRaw(props.mine), val)
})

watch([safe, activeMineName], ([val]) => {
  console.log('安全监测: ', val)
  loadMineDevicePoint(toRaw(props.mine), 'safe_Point', val)
})

watch([hole, activeMineName], ([val]) => {
  console.log('地面钻孔: ', val)
  loadMineGroundHole(toRaw(props.mine), val)
})

watch([water, activeMineName], ([val]) => {
  console.log('积水区: ', val)
  loaMineWaterArea(toRaw(props.mine), val)
})

const treeData = [
  {
    title: '数据',
    key: '0-0',
    children: [
      {
        title: '裁切',
        key: '0-0-0',
        build: cut,
      },
      {
        title: '巷道',
        key: '0-0-1',
        build: tunnel,
      },

      {
        title: '安全监测',
        key: '0-0-3',
        build: safe,
      },
      {
        title: '地面钻孔',
        key: '0-0-4',
        build: hole,
      },
      {
        title: '积水区',
        key: '0-0-5',
        build: water,
      },
    ],
  },
  {
    title: '模型',
    key: '0-1',
    children: [
      {
        title: '巷道模型',
        key: '0-1-1',
        build: tunnelModel,
      },
    ],
  },
]

function check(keys) {
  console.log(keys)
  console.log(checkedKeys)
  const res1 = findFieldsInTree(treeData, keys)
  const res2 = findMissingKeys(treeData, keys)
  res1.forEach((item) => {
    if (item !== undefined) {
      item.value = true
    }
  })
  res2.forEach((item) => {
    if (item !== undefined) {
      item.value = false
    }
  })

  // 发射勾选状态变化事件
  emit('checkedKeysChange', keys)
}

function findFieldsInTree(tree, keys) {
  const result = new Map()
  function dfs(node) {
    if (!node) return

    // 如果当前节点的 key 在目标集合中，就记录
    if (keys.includes(node.key)) {
      result.set(node.key, node.build)
    }

    // 继续遍历 children
    if (node.children?.length) {
      node.children.forEach(dfs)
    }
  }
  tree.forEach(dfs)
  return result
}

function findMissingKeys(tree, keys) {
  const result = new Map()
  function dfs(node) {
    if (!node) return

    // 如果当前节点的 key 在目标集合中，就记录
    if (!keys.includes(node.key)) {
      result.set(node.key, node.build)
    }

    // 继续遍历 children
    if (node.children?.length) {
      node.children.forEach(dfs)
    }
  }
  tree.forEach(dfs)
  return result
}
</script>

<template>
  <div>
    <Tree
      checkable
      :tree-data="treeData"
      :showLine="true"
      @check="check"
      defaultExpandAll
      v-model:checkedKeys="checkedKeys"
    />
  </div>
</template>

<style lang="less"></style>
