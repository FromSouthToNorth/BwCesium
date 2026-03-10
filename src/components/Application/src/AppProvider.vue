<script>
import { contextInit } from '@/utils/mqtt'
export default {
  name: 'AppProvider',
  inheritAttrs: false,
  setup(props, { slots }) {
    contextInit();
    return () => slots.default?.()
  },
}
</script>
