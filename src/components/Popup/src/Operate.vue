<script setup>
import { ref, toRaw, watch, unref, onMounted } from 'vue';
import { Checkbox, Tree } from 'ant-design-vue';
import {
  traverseBoundaryClipping,
  loadMineDevicePoint,
  loadMineTunnel,
  loadMineTunnelModel,
  loadMineGroundHole,
  loaMineWaterArea,
} from '@/utils/cesium';
import { forEach } from 'lodash-es';

const props = defineProps({
  mine: Object,
  initialCheckedKeys: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['checkedKeysChange']);

const cut = ref(false);
const tunnel = ref(false);
const tunnelModel = ref(false);
const safe = ref(false);
const hole = ref(false);
const water = ref(false);
const mineInfo = ref(null);
const checkedKeys = ref(props.initialCheckedKeys || [])

let mineName = '';

watch(() => unref(props.mine), (val) => {
  if (mineName !== val.name) {
    // 只有矿山名称变化时才重置
    mineName = val.name;
    checkedKeys.value = props.initialCheckedKeys || [];
    cut.value = false;
    tunnel.value = false;
    tunnelModel.value = false;
    safe.value = false;
    hole.value = false;
    water.value = false;
  }
  // 如果矿山名称相同，保留 checkedKeys 的值
});

watch(() => unref(cut), (val) => {
  console.log('裁切: ', val);
  traverseBoundaryClipping(toRaw(props.mine), val);
});

watch(() => unref(tunnel), (val) => {
  console.log('巷道: ', val);
  loadMineTunnel(toRaw(props.mine), 'tunnel_LineString', val);
});

watch(() => unref(tunnelModel), (val) => {
  console.log('巷道模型: ', val);
  loadMineTunnelModel(toRaw(props.mine), val);
});

watch(() => unref(safe), (val) => {
  console.log('安全监测: ', val);
  loadMineDevicePoint(toRaw(props.mine), 'safe_Point', val);
});

watch(() => unref(hole), (val) => {
  console.log('地面钻孔: ', val);
  loadMineGroundHole(toRaw(props.mine), val);
});

watch(() => unref(water), (val) => {
  console.log('积水区: ', val);
  loaMineWaterArea(toRaw(props.mine), val)
});

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
    ]
  }
]

function check(keys) {
  console.log(keys);
  console.log(checkedKeys);
  const res1 = findFieldsInTree(treeData, keys);
  const res2 = findMissingKeys(treeData, keys);
  res1.forEach(item => {
    if (item !== undefined) {
      item.value = true;
    }
  });
  res2.forEach(item => {
    if (item !== undefined) {
      item.value = false;
    }
  });

  // 发射勾选状态变化事件
  emit('checkedKeysChange', keys);
}

function findFieldsInTree(tree, keys) {
  const result = new Map();
  function dfs(node) {
    if (!node) return;

    // 如果当前节点的 key 在目标集合中，就记录
    if (keys.includes(node.key)) {
      result.set(node.key, node.build);
    }

    // 继续遍历 children
    if (node.children?.length) {
      node.children.forEach(dfs);
    }
  }
  tree.forEach(dfs);
  return result;
}

function findMissingKeys(tree, keys) {
  const result = new Map();
  function dfs(node) {
    if (!node) return;

    // 如果当前节点的 key 在目标集合中，就记录
    if (!keys.includes(node.key)) {
      result.set(node.key, node.build);
    }

    // 继续遍历 children
    if (node.children?.length) {
      node.children.forEach(dfs);
    }
  }
  tree.forEach(dfs);
  return result;
}
</script>

<template>
  <div>
    <!-- <Checkbox v-model:checked="cut">
      裁切
    </Checkbox>
    <Checkbox v-model:checked="tunnel">
      巷道
    </Checkbox>
    <Checkbox v-model:checked="tunnelModel">
      巷道模型
    </Checkbox>
    <Checkbox v-model:checked="safe">
      安全监测
    </Checkbox>
    <Checkbox v-model:checked="hole">
      地面钻孔
    </Checkbox>
    <Checkbox v-model:checked="water">
      积水区
    </Checkbox> -->
    <Tree checkable :tree-data="treeData" :showLine="true" @check="check" defaultExpandAll
      v-model:checkedKeys="checkedKeys" />
  </div>
</template>

<style lang="less"></style>
