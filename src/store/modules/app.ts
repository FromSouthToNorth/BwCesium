import { defineStore } from 'pinia'
import { store } from '@/store'

let timeId = null
export const useAppStore = defineStore({
  id: 'app',
  state: () => ({
    pageLoading: false
  }),
  getters: {
    getPageLoading(state) {
      return state.pageLoading
    },
  },
  actions: {
    setPageLoading(loading) {
      if (loading) {
        clearTimeout(timeId)
        // Prevent flicker
        timeId = setTimeout(() => {
          this.setPageLoading(loading)
        }, 50)
      }
      else {
        this.setPageLoading(loading)
        clearTimeout(timeId)
      }
    }
  }
})

// Need to be used outside the setup
export function useAppStoreWithOut() {
  return useAppStore(store)
}
