<script setup>
import { ConfigProvider } from 'ant-design-vue/lib'
import { AppProvider } from '@/components/Application'
</script>

<template>
  <ConfigProvider>
    <AppProvider>
      <RouterView />
    </AppProvider>
  </ConfigProvider>
</template>

<style scoped></style>
