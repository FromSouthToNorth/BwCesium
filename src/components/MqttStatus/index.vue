<template>
  <div class="mqtt-status-container">
    <button class="mqtt-status-btn" @click="handleShowStatus">
      <span class="status-indicator" :class="statusClass"></span>
      MQTT 状态
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getMqttStatusInfo, showMqttStatusModal } from '@/utils/mqtt'

const statusInfo = ref<any>(null)

const updateStatus = () => {
  statusInfo.value = getMqttStatusInfo()
}

const statusClass = computed(() => {
  updateStatus()
  return {
    'connected': statusInfo.value?.isConnected,
    'disconnected': !statusInfo.value?.isConnected,
  }
})

const handleShowStatus = () => {
  showMqttStatusModal()
}

// 初始化状态
updateStatus()

// 定期更新状态
setInterval(() => {
  updateStatus()
}, 5000)
</script>

<style scoped>
.mqtt-status-container {
  display: inline-block;
}

.mqtt-status-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  background-color: #fff;
  transition: all 0.3s ease;
}

.mqtt-status-btn:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background-color: #52c41a;
  box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
}

.status-indicator.disconnected {
  background-color: #ff4d4f;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }

  100% {
    opacity: 1;
  }
}
</style>
