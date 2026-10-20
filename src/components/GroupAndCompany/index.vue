<script setup lang="ts">
import { ref } from 'vue';
import Map from './src/Map.vue';
import Sidebar from './src/Sidebar.vue';

const mapPane = ref(false);

function openClick(e: boolean) {
  console.log('openClick', e);
  mapPane.value = e;
}
</script>

<template>
  <div class=" groupAndCompany-container">
    <Sidebar @openClick="openClick" />
    <Map />
  </div>
</template>

<style lang="css" scoped>
.groupAndCompany-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
