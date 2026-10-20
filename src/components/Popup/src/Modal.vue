<template>
  <BaseDraggableModal
    :title="props.modalContent?.title || '详情'"
    :open="props.showModal"
    :mask="props.mask"
    width="260px"
    @afterClose="afterClose"
  >
    <Menu
      :menuData="props.modalContent.data"
      :sourceTarget="props.modalContent.sourceTarget"
      v-if="props.modalContent.type === 'menu'"
    />
    <Descriptions
      :columns="props.modalContent.columns"
      :data="props.modalContent.data"
      v-else-if="props.modalContent.type === 'descriptions'"
    />
    <ModelSlider
      v-else-if="props.modalContent.type === 'modelSlider'"
      :model="props.modalContent.model"
      @originPointClose="afterClose"
    />
  </BaseDraggableModal>
</template>

<script setup lang="ts">
import Descriptions from './Descriptions.vue'
import Menu from './Menu.vue'
import ModelSlider from './ModelSlider.vue'
import BaseDraggableModal from './BaseDraggableModal.vue'

const props = defineProps({
  modalContent: { type: Object as any, default: () => ({}) },
  showModal: {
    type: Boolean,
    default: false,
  },
  mask: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['afterClose'])

function afterClose(val) {
  emit('afterClose', val)
}
</script>
