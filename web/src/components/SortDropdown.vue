<template>
  <div class="sort-dropdown" @click.stop>
    <button class="sort-trigger" @click="toggleDropdown" :title="currentSortLabel">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"/>
      </svg>
      <span class="sort-label">{{ shortLabel }}</span>
      <svg class="chevron" :class="{ open: isOpen }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    
    <transition name="dropdown">
      <div v-if="isOpen" class="sort-menu">
        <div 
          v-for="group in sortGroups" 
          :key="group.key"
          class="sort-group"
        >
          <div class="group-label">{{ group.label }}</div>
          <div class="group-options">
            <button
              v-for="option in group.options"
              :key="option.value"
              class="sort-btn"
              :class="{ active: currentSort === option.value }"
              @click="selectSort(option.value)"
              :title="option.tip"
            >
              {{ option.text }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'time_desc'
  },
  storageKey: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);

const sortGroups = [
  {
    key: 'time',
    label: '时间',
    options: [
      { value: 'time_desc', text: '最新', tip: '按创建时间从新到旧' },
      { value: 'time_asc', text: '最早', tip: '按创建时间从旧到新' }
    ]
  },
  {
    key: 'freq',
    label: '频率',
    options: [
      { value: 'freq_desc', text: '最多', tip: '按使用频率从高到低' },
      { value: 'freq_asc', text: '最少', tip: '按使用频率从低到高' }
    ]
  },
  {
    key: 'name',
    label: '名称',
    options: [
      { value: 'name_asc', text: 'A-Z', tip: '按名称升序' },
      { value: 'name_desc', text: 'Z-A', tip: '按名称降序' }
    ]
  }
];

const currentSort = computed(() => props.modelValue);

const shortLabel = computed(() => {
  const sortType = currentSort.value;
  if (sortType.startsWith('time')) return sortType === 'time_desc' ? '最新' : '最早';
  if (sortType.startsWith('freq')) return sortType === 'freq_desc' ? '频率↑' : '频率↓';
  if (sortType.startsWith('name')) return sortType === 'name_asc' ? 'A-Z' : 'Z-A';
  return '排序';
});

const currentSortLabel = computed(() => {
  const sortType = currentSort.value;
  if (sortType === 'time_desc') return '时间: 最新优先';
  if (sortType === 'time_asc') return '时间: 最早优先';
  if (sortType === 'freq_desc') return '频率: 最多优先';
  if (sortType === 'freq_asc') return '频率: 最少优先';
  if (sortType === 'name_asc') return '名称: A-Z';
  if (sortType === 'name_desc') return '名称: Z-A';
  return '排序';
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function selectSort(value) {
  emit('update:modelValue', value);
  emit('change', value);
  
  if (props.storageKey) {
    try {
      localStorage.setItem(props.storageKey, value);
    } catch (e) {}
  }
  
  isOpen.value = false;
}

function closeDropdown() {
  isOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', closeDropdown);
  
  if (props.storageKey) {
    try {
      const saved = localStorage.getItem(props.storageKey);
      if (saved) {
        emit('update:modelValue', saved);
      }
    } catch (e) {}
  }
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});
</script>

<style scoped>
.sort-dropdown {
  position: relative;
  z-index: 100;
}

.sort-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  color: #4a5568;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sort-trigger:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.sort-label {
  font-size: 12px;
}

.chevron {
  transition: transform 0.2s ease;
  opacity: 0.6;
}

.chevron.open {
  transform: rotate(180deg);
}

.sort-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sort-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 2px;
}

.group-options {
  display: flex;
  gap: 6px;
}

.sort-btn {
  flex: 1;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sort-btn:hover {
  background: rgba(66, 153, 225, 0.1);
  border-color: rgba(66, 153, 225, 0.3);
  color: #3182ce;
}

.sort-btn.active {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.35);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

@media (max-width: 768px) {
  .sort-trigger {
    padding: 4px 8px;
  }
  
  .sort-menu {
    right: -10px;
    min-width: 180px;
    padding: 8px;
  }
  
  .sort-btn {
    padding: 5px 8px;
    font-size: 11px;
  }
}
</style>
