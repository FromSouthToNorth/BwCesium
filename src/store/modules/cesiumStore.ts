import { defineStore } from "pinia";

export const useCesiumStore = defineStore('cesium', {
  state: () => ({
    viewer: null as any,
  }),
  actions: {
    setViewer(viewer: any) {
      console.log('setViewer', viewer);
      this.viewer = viewer
    },
    getViewer() {
      if (!this.viewer) {
        console.warn('Cesium Viewer 未初始化');
        return null;
      }
      return this.viewer;
    },
    clearViewer() {
      if (this.viewer) {
        this.viewer.destroy()
      }
      this.viewer = null
    }
  }
})
