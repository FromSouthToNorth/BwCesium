<template>
  <div ref="cesiumContainer" id="cesiumContainer">
    <div class="select-search">
      <Select show-search :style="{ width: '100%' }" :disabled="selDisabled" v-model:value="searchValue"
        :default-active-first-option="false" :show-arrow="false" :filter-option="false" :not-found-content="null"
        :options="nameOptions" @search="selectSearch" @change="handleChange" placeholder="输入矿井名称">
        <Select.Option v-for="option in nameOptions" :key="option.value">
          {{ option.value }}
        </Select.Option>
      </Select>
    </div>

    <CesiumPopup v-if="cesiumPopup.show" :position="cesiumPopup.position" :title="cesiumPopup.title"
      :content="cesiumPopup.content" :offset="cesiumPopup.offset" @close="() => { cesiumPopup.show = false }">
    </CesiumPopup>
    <Modal :showModal="showModal" :modalContent="modalContent" :mask="false" @afterClose="afterClose" />
    <OperateModal :showModal="showOpModal" :mine="mine" :mask="false"
      :initialCheckedKeys="mineCheckedKeys[mine.name] || []" @afterClose="afterOpClose"
      @checkedKeysChange="handleCheckedKeysChange" />
    <div class="right-bottom">
      <div class="" v-html="totalHtml" />
    </div>
    <Info />
    <ClippingElevationDialog v-model:open="showOpModal" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, unref, watch, toRaw } from 'vue';
import { Select } from 'ant-design-vue';
import { Camera, Rectangle } from 'cesium';

import CesiumPopup from '@/components/Popup/index.vue';
import Info from './CesiumInfo.vue';
import { Modal, OperateModal } from '@/components/Popup';
import { isAlphabetic } from '@/utils/is';

import { useGroupCompanyLevelMine } from './hooks/useGroupCompanyLevelMine';
import { flyToBoundary, flyTo } from '@/utils/cesium';
import { useSetting } from '@/hooks/setting/useSetting';
import { utilMenu } from '@/utils/menu';
import { getActiveEntity, initializeCesium, geoJSONPointLoad, destroyCesium } from '@/utils/cesium';
import { turfFeatureCollection, turfBbox } from '@/utils/turf';
import { getViewer } from '@/utils/cesium';
import ClippingElevationDialog from '@/components/Popup/src/ClippingElevationDialog/index.vue';

const { getGroupCompanyLevelMine, getContextmenuItems } = useGroupCompanyLevelMine();
const { setPageLoading } = useSetting();

// 响应式数据
const nameOptions = ref([]);
const contentmenu = ref({});
const geojsonPoints = ref();
const showModal = ref(false);
const showOpModal = ref(false);
const cesiumContainer = ref(null);
const searchValue = ref('');
const totalHtml = ref('');
const selDisabled = ref(true);
const mine = ref({});
const modalContent = ref({});
const cesiumPopup = ref({
  show: false,
  position: null,
  title: '',
  content: '',
  offset: [0, 30],
});
// 保存每个矿山的勾选状态
const mineCheckedKeys = ref({});

// 非响应式变量
let editMenu = null;
let searchTimer = null;

function handleChange(value) {
  const viewer = getViewer();
  const entities = viewer?.dataSources?.get(0)?.entities?.values || [];
  const target = entities.find(e => e?.properties?.getValue()?.name === value);
  if (!target) {
    searchValue.value = '';
    return;
  }
  const val = target.properties;
  const { B, L } = val.getValue() || {};
  afterOpClose(false);
  flyToBoundary({ B, L }, () => {
    mine.value = val.getValue();
    afterOpClose(true);
  });
  searchValue.value = '';
}

function selectSearch(value) {
  // 简单防抖以减少频繁检索
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const str = String(value || '').trim();
    if (!str) {
      nameOptions.value = [];
      return;
    }
    const viewer = getViewer();
    const values = viewer?.dataSources?.get(0)?.entities?.values || [];
    const arr = values.filter((layer) => {
      const properties = layer?.properties?.getValue?.() || {};
      if (isAlphabetic(str)) {
        return String(properties.MineDesc || '').toUpperCase().includes(str.toUpperCase());
      }
      return String(properties.name || '').includes(str);
    });
    nameOptions.value = arr.map((e) => {
      const properties = e.properties.getValue();
      return {
        value: properties.name,
        label: properties.name,
      };
    });
  }, 180);
}

function clearPopup() {
  cesiumPopup.value.show = false;
  afterClose(false);
  editMenu?.remove?.();
}

onMounted(() => {
  const viewer = initializeCesium(cesiumContainer.value, editMenu);
  const _viewer = toRaw(unref(viewer));
  _viewer.camera.moveEnd.addEventListener(() => {
    editMenu?.remove?.();
  });
});

function afterClose(e) {
  showModal.value = e;
}

function afterOpClose(e) {
  showOpModal.value = e;
}

// 处理勾选状态变化
function handleCheckedKeysChange(keys) {
  if (mine.value?.name) {
    mineCheckedKeys.value[mine.value.name] = keys;
  }
}

/*** 监听右键菜单项变化 */
watch(() => unref(getContextmenuItems), (newVal) => {
  const viewer = getViewer();
  const { menuItems, type } = newVal;
  contentmenu.value.menuItems = menuItems;
  contentmenu.value.type = 'menu';
  const { entity } = contentmenu.value;
  const position = contentmenu.value.position;
  editMenu = utilMenu({ type, position, menuItems: contentmenu.value.menuItems, viewer, sourceTarget: contentmenu.value.sourceTarget });
  editMenu();
});

watch(() => unref(getGroupCompanyLevelMine), (newVal) => {
  console.log('getGroupCompanyLevelMine: ', newVal);
  const { data, contextmenuItems, total, columns: _columns } = newVal;
  totalHtml.value = total;
  geojsonPoints.value = turfFeatureCollection(data);
  const bbox = turfBbox(geojsonPoints.value);
  const destination = Rectangle.fromDegrees(bbox[0] - 6, bbox[1] - 6, bbox[2] + 6, bbox[3] + 6);
  Camera.DEFAULT_VIEW_RECTANGLE = destination;
  console.log('destination: ', destination);
  flyTo(destination, () => {
    geoJSONPointLoad(geojsonPoints.value, 'MinePoint', { isSetupClustering: true });
    selDisabled.value = false;
    setPageLoading(false);
  });
});

function buildCesiumPopup(e) {
  const { position, sourceTarget, content, title } = e;
  cesiumPopup.value.position = position;
  cesiumPopup.value.sourceTarget = sourceTarget;
  cesiumPopup.value.title = title;
  cesiumPopup.value.content = content;
  cesiumPopup.value.offset = [0, -25];
  cesiumPopup.value.show = true;
}

watch(() => unref(getActiveEntity), (newVal) => {
  clearPopup();
  if (!newVal) {
    return;
  }
  const { type, position, sourceTarget, content, entity, title, model } = newVal;
  switch (type) {
    case 'popup':
      buildCesiumPopup(newVal);
      break;
    case 'operate':
      buildCesiumPopup(newVal);
      mine.value = sourceTarget;
      afterOpClose(true);
      break;
    case 'rightClickMenu':
      contentmenu.value.entity = entity;
      contentmenu.value.sourceTarget = sourceTarget;
      contentmenu.value.title = title;
      contentmenu.value.position = position;
      break;
    case 'modelSlider':
      afterClose(true);
      modalContent.value.type = type;
      modalContent.value.model = model;
      console.log('modalContent: ', modalContent);
      break;
  }
});

onUnmounted(() => {
  destroyCesium();
});
</script>

<style scoped lang="less">
#cesiumContainer {
  display: flex;
  width: 100%;
  height: 100%;
  background: #222;

  .left-top {
    position: absolute;
    z-index: 999;
    top: 10px;
    right: 10px;
  }

  .right-bottom {
    font-size: 12px;
    position: absolute;
    z-index: 999;
    right: 32px;
    bottom: 2px;
    padding: 6px;
    border-radius: 4px;
    background: #fff;

    .online {
      color: #0F9E5E;
      font-weight: 600;
    }
  }

  .select-search {
    width: 200px;
    position: absolute;
    z-index: 9999;
    left: 6px;
    top: 6px
  }
}
</style>
