<script setup>
import { Spin } from 'ant-design-vue'

defineOptions({ name: 'Loading' })

defineProps({
  tip: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'large',
    validator: (v) => {
      return ['default', 'small', 'large'].includes(v)
    },
  },
  absolute: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  background: {
    type: String,
  },
  theme: {
    type: String,
  },
})
</script>

<template>
  <section v-show="loading" class="full-loading" :class="{ absolute, [`${theme}`]: !!theme }"
    :style="[background ? `background-color: ${background}` : '']">
    <Spin v-bind="$attrs" :tip="tip" :size="size" :spinning="loading" />
  </section>
</template>

<style lang="less" scoped>
.full-loading {
  display: flex;
  position: fixed;
  z-index: 300;
  top: 0;
  left: 0;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: rgb(240 242 245 / 40%);

  &.absolute {
    position: absolute;
    z-index: 400;
    top: 0;
    left: 0;
  }
}
</style>
