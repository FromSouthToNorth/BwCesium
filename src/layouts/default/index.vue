<script lang="ts" setup>
import { Layout } from 'ant-design-vue'
import { useSetting } from '@/hooks/setting/useSetting'

defineOptions({ name: 'DefaultLayout' })

const { getPageLoading } = useSetting()
</script>

<template>
  <Layout :class="`bw-main`" v-loading="getPageLoading">
    <RouterView>
      <template #default="{ Component, route }">
        <component :is="Component" :key="route.fullPath" />
      </template>
    </RouterView>
  </Layout>
</template>
