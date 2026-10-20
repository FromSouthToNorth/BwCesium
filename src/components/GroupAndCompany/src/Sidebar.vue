<template>
  <div class="sidebar" :style="{
    marginLeft: mapPane ? '' : '-320px',
    width: mapPane ? '320px' : '0',
  }">
    <Button :class="mapPane ? '' : 'menu-collapse-btn-close'" class="menu-collapse-btn" @click="openClick">
      <template #icon>
        <LeftOutlined v-if="mapPane" />
        <RightOutlined v-else />
      </template>
    </Button>
    <div class="inspector-body sep-top">
      <div :style="{ margin: '0 12px', marginTop: '36px' }">
        <Tag v-for="tag in selectTagArray" :key="tag.value" class="tag" closable @close="tagClose(tag)">
          <span class="tag-label">{{ tag.label }}</span>
          :
          <span class="tag-name">{{ tag.name }}</span>
        </Tag>
      </div>
      <Collapse accordion>
        <Collapse.Panel v-for="item in commonItemsStatPen.data" :key="item.id" :header="item.name">
          <Table ref="table" :key="commonItemsStatPen.key" :size="'small'" :columns="commonItemsStatPen.columns"
            :row-key="commonItemsStatPen.key" :data-source="item.dataSource" :customRow="rowOn" :pagination="paging"
            @change="handleTableChange" />
        </Collapse.Panel>
      </Collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, unref, onMounted, watch } from 'vue';
import { Button, Tag, Collapse, Table } from 'ant-design-vue';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import type { SorterResult } from 'ant-design-vue/es/table/interface';
import { RightOutlined, LeftOutlined } from '@ant-design/icons-vue';
import { groupCompanyLevelMine, commonItemsStat } from '@/utils/mqtt/publish';
import { useGroupCompanyLevelMine } from './hooks/useGroupCompanyLevelMine';
import type { CommonItemsStatData, StatGroup, StatRow } from './hooks/useGroupCompanyLevelMine';

const { getCommonItemsStat } = useGroupCompanyLevelMine();
const emit = defineEmits<{ openClick: [value: boolean] }>();

/** 查询过滤字段 */
type FilterField = 'year' | 'ol' | 'pid' | 'gid' | 'iid';

/** 顶部已选条件标签 */
interface TagEntry {
  value: FilterField;
  label: string;
  name?: string;
  id?: string | number;
}

// 响应式数据
const mapPane = ref(false);
const selectTagArray = ref<TagEntry[]>([]);
const commonItemsStatPen = ref<{
  data: StatGroup[];
  key: string;
  columns: TableColumnsType;
}>({
  data: [],
  key: 'Id',
  columns: [],
});
const paging = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  pageSizeOptions: ['10', '20', '50', '200', '1000'],
  showTotal: (total, range) => {
    return `${range[0]}-${range[1]} 共${total}条`;
  },
  showQuickJumper: true,
  showSizeChanger: true,
});
const sorter = ref({
  column: 'createTime',
  order: 'desc',
});

// 常量定义
const TAGS: TagEntry[] = [
  { value: 'year', label: '年份' },
  { value: 'ol', label: '是否在线' },
  { value: 'pid', label: '省份' },
  { value: 'gid', label: '集团' },
  { value: 'iid', label: '集成商' },
];

// 非响应式数据
const parameter: Record<FilterField, string> = {
  year: '',
  ol: '',
  pid: '',
  gid: '',
  iid: '',
};
const tagMap = new Map<string, { id: string | number; name: string }[]>();
const tagSet = new Set<TagEntry>();

onMounted(() => {
  commonItemsStat(parameter);
});

watch(() => unref(getCommonItemsStat), (newVal) => {
  if (!newVal) return;
  commonItemsStatPen.value.data = newVal.data;
  commonItemsStatPen.value.columns = (newVal.columns ?? []) as TableColumnsType;
  commonItemsStatPen.value.key = newVal.key ?? 'Id';
});

function openClick() {
  mapPane.value = !mapPane.value;
  emit('openClick', mapPane.value);
}

function rowOn(record: StatRow) {
  return {
    onClick: () => {
      const { id, field, name } = record;
      if (!(field in parameter)) return;
      const values = tagMap.get(field);
      if (values && !values.some(v => v.id === id)) {
        values.push({ id, name });
      } else {
        tagMap.set(field, [{ id, name }]);
      }
      parameter[field as FilterField] = id;
      const tag = TAGS.find(t => t.value === field);
      if (tag) {
        tag.name = name;
        tag.id = id;
        tagSet.add(tag);
        selectTagArray.value = [...tagSet];
      }
      groupCompanyLevelMine(parameter);
    },
  };
}

function tagClose(tag: TagEntry) {
  parameter[tag.value] = '';
  tagSet.forEach((e) => {
    if (e.value === tag.value) {
      tagSet.delete(e);
    }
  });
  selectTagArray.value = [...tagSet];
  groupCompanyLevelMine(parameter);
}

function handleTableChange(
  pagination: TablePaginationConfig,
  _filters: Record<string, (string | number | boolean)[] | null>,
  tableSorter: SorterResult<StatRow> | SorterResult<StatRow>[],
) {
  // 分页、排序、筛选变化时触发
  const currentSorter = Array.isArray(tableSorter) ? tableSorter[0] : tableSorter;
  if (currentSorter && Object.keys(currentSorter).length > 0 && currentSorter.order) {
    sorter.value.column = String(currentSorter.field ?? '');
    sorter.value.order = currentSorter.order === 'ascend' ? 'asc' : 'desc';
  }
  paging.value = pagination;
}
</script>

<style lang="less">
.sidebar {
  height: 100%;
  position: fixed;
  z-index: 1000;
  padding-bottom: 60px;
  transition: all .45s;
  border: 1px solid #ccc;
  border-right-width: 0;
  background: #f6f6f6;
}

.inspector-body {
  position: relative;
  flex: 1 1 100%;
  max-height: 800px;
  padding: 4px;
  overflow-x: hidden;
  overflow-y: scroll;
}

.menu-collapse-btn {
  position: fixed;
  top: 80px;
  left: 332px;
}

.menu-collapse-btn-close {
  left: 12px
}

.tag {
  margin-bottom: 2px;

  .tag-label {
    color: #2db7f5;
    font-weight: bold;
  }
}
</style>
