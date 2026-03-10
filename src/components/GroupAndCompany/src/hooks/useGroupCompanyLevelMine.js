import { computed, ref, unref } from 'vue';
import { fun } from '../fun';

// 状态存储
const groupCompanyLevelMine = ref();
const commonItemsStat = ref();
const contextmenuItems = ref();
const tunnelGeoJSON = ref();
const devicePointGeoJSON = ref();
const groundHoleGeoJSON = ref();
const waterAreaGeoJSON = ref();
const traverseBoundary = ref();

export function useGroupCompanyLevelMine() {
  // 设置函数
  function setGroupCompanyLevelMine(val) {
    groupCompanyLevelMine.value = val;
  }

  function setCommonItemsStat(data) {
    commonItemsStat.value = data;
  }

  function setContextmenuItems(val) {
    const { data, type } = val;
    const menuItems = [...data];

    menuItems.forEach((e) => {
      const { menu } = e;
      menu.forEach((t) => {
        t.operation = fun[t.operation];
      });
    });

    contextmenuItems.value = { menuItems, type };
  }

  function setTunnelGeoJSON(val) {
    tunnelGeoJSON.value = val.data;
  }

  function setDevicePointGeoJSON(val) {
    devicePointGeoJSON.value = val.data;
  }

  function setGroundHoleGeoJSON(val) {
    groundHoleGeoJSON.value = val.data;
  }

  function setWaterAreaGeoJSON(val) {
    waterAreaGeoJSON.value = val.data;
  }

  function setTraverseBoundaryGeoJSON(val) {
    traverseBoundary.value = val.data;
  }

  // 计算属性
  const getGroupCompanyLevelMine = computed(() => unref(groupCompanyLevelMine));
  const getCommonItemsStat = computed(() => unref(commonItemsStat));
  const getContextmenuItems = computed(() => unref(contextmenuItems));
  const getTunnelGeoJSON = computed(() => unref(tunnelGeoJSON));
  const getDevicePointGeoJSON = computed(() => unref(devicePointGeoJSON));
  const getGroundHoleGeoJSON = computed(() => unref(groundHoleGeoJSON));
  const getWaterAreaGeoJSON = computed(() => unref(waterAreaGeoJSON));
  const getTraverseBoundaryGeoJSON = computed(() => unref(traverseBoundary));

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
  };
}
