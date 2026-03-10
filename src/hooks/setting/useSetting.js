import { computed, ref, unref } from 'vue'

const pageLoading = ref(false)
export function useSetting() {

  function setPageLoading(loading) {
    pageLoading.value = loading
  }

  const getPageLoading = computed(() => unref(pageLoading))

  return {
    setPageLoading,
    getPageLoading,
  }
}
