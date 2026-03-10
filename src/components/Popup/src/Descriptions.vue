<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { Descriptions } from 'ant-design-vue'

defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  data: Object
})
</script>

<template>
  <Descriptions bordered size="small">
    <Descriptions.Item v-for="({ dataIndex, title }) in columns" :label="title">
      {{ data[dataIndex] }}
    </Descriptions.Item>
  </Descriptions>
</template>
