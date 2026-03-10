<script setup>
import { Button } from 'ant-design-vue';
import { DataSource } from 'cesium';
defineProps({
  menuData: {
    type: Array,
    default: () => []
  },
  sourceTarget: Object
})
</script>
<template>
  <div class="">
    <div class="" v-for="({ title, menu }) in menuData">
      <div>{{ title }}</div>
      <div class="">
        <Button size="small" v-for="item in menu" :data-tooltip="item.url" @click="item.operation(item, sourceTarget)">
          {{ item.title }}
        </Button>
      </div>
    </div>
  </div>
</template>
