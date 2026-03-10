<script lang="ts" setup>
import { Layout } from 'ant-design-vue'
import PageLayout from '@/layouts/page/index.vue'
import { useSetting } from '@/hooks/setting/useSetting'

defineOptions({ name: 'LayoutContent' })

const { getPageLoading } = useSetting()
</script>

<template>
  <Layout ref="content" v-loading="getPageLoading">
    <PageLayout ref="content" />
  </Layout>
</template>
