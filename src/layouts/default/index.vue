<script lang="ts" setup>
import { Layout } from 'ant-design-vue'
import LayoutContent from './content/index.vue'

</script>

<template>
  <Layout>
    <Layout :class="`bw-main`">
      <LayoutContent />
    </Layout>
  </Layout>
</template>
