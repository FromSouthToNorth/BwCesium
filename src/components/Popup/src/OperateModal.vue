<template>
  <BaseDraggableModal :title="props.mine?.name || '操作'" :open="props.showModal" :mask="props.mask" width="220px"
    @afterClose="afterClose" @ok="handleOk">
    <Operate :mine="props.mine" :initialCheckedKeys="props.initialCheckedKeys"
      @checkedKeysChange="handleCheckedKeysChange" />
  </BaseDraggableModal>
</template>

<script setup lang="ts">
import Operate from './Operate.vue';
import BaseDraggableModal from './BaseDraggableModal.vue';

const props = defineProps({
  mine: Object,
  showModal: {
    type: Boolean,
    default: false,
  },
  mask: {
    type: Boolean,
    default: true,
  },
  initialCheckedKeys: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['afterClose', 'ok', 'checkedKeysChange']);

function afterClose(val) {
  emit('afterClose', val);
}

function handleOk() {
  emit('ok');
}

function handleCheckedKeysChange(keys) {
  emit('checkedKeysChange', keys);
}
</script>
