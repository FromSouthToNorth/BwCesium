import { computed } from "vue";

import { useCesiumStore } from "@/store/modules/cesiumStore";
export function useCesium() {
  const cesiumStore = useCesiumStore();

  const viewerRef = computed(() => cesiumStore.viewer);

  return {
    viewerRef
  };
}
