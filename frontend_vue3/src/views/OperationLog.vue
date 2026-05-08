<template>
  <div class="operation-log">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="操作模块">
          <el-select v-model="filters.module" placeholder="全部模块" clearable style="width: 140px">
            <el-option label="角色" value="role" />
            <el-option label="部门" value="department" />
            <el-option label="用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filters.action" placeholder="全部类型" clearable style="width: 160px">
            <el-option label="新增" value="create" />
            <el-option label="编辑" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="恢复" value="restore" />
            <el-option label="权限变更" value="update-permissions" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="filters.username" placeholder="用户名" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志列表 -->
    <el-card shadow="never" style="margin-top: 16px">
      <el-table :data="logList" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="操作人" width="110" />
        <el-table-column label="操作模块" width="100">
          <template #default="{ row }">
            <el-tag :type="moduleTagType(row.module)" size="small" effect="plain">
              {{ moduleLabel(row.module) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作类型" width="110">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)" size="small">
              {{ actionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_name" label="操作对象" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作详情" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.detail" class="detail-text">{{ formatDetail(row) }}</span>
            <span v-else class="detail-empty">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column prop="created_at" label="操作时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="操作详情" width="560px">
      <div v-if="currentDetail" class="detail-content">
        <div class="detail-row" v-for="(value, key) in currentDetail" :key="key">
          <span class="detail-key">{{ key }}</span>
          <span class="detail-value">{{ value }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOperationLogs } from '../api/operationLogs'

const logList = ref([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const dateRange = ref(null)

const filters = reactive({
  module: '',
  action: '',
  username: ''
})

const detailVisible = ref(false)
const currentDetail = ref(null)

const moduleLabelMap = {
  role: '角色',
  department: '部门',
  user: '用户'
}

const actionLabelMap = {
  create: '新增',
  update: '编辑',
  delete: '删除',
  restore: '恢复',
  'update-permissions': '权限变更'
}

function moduleLabel(m) {
  return moduleLabelMap[m] || m
}

function actionLabel(a) {
  return actionLabelMap[a] || a
}

function moduleTagType(m) {
  const map = { role: 'warning', department: 'success', user: '' }
  return map[m] || 'info'
}

function actionTagType(a) {
  const map = { create: 'success', update: '', delete: 'danger', restore: 'warning', 'update-permissions': 'info' }
  return map[a] || 'info'
}

function formatTime(t) {
  if (!t) return '—'
  return t.replace('T', ' ').substring(0, 19)
}

function formatDetail(row) {
  if (!row.detail) return '—'
  try {
    const obj = JSON.parse(row.detail)
    const parts = []
    if (obj.name) parts.push(`名称: ${obj.name}`)
    if (obj.code) parts.push(`编码: ${obj.code}`)
    if (obj.data_scope) parts.push(`数据权限: ${obj.data_scope}`)
    
    // 优先显示权限名称（人类可读）
    if (obj.permission_names && obj.permission_names.length > 0) {
      const permNames = obj.permission_names.map(p => p.name).join('、')
      parts.push(`权限: ${permNames}`)
    } else if (obj.permission_ids) {
      parts.push(`权限ID: [${obj.permission_ids.join(', ')}]`)
    }
    
    return parts.join(' | ') || JSON.stringify(obj)
  } catch {
    return row.detail
  }
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (filters.module) params.module = filters.module
    if (filters.action) params.action = filters.action
    if (filters.username) params.username = filters.username
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const res = await getOperationLogs(params)
    if (res.success) {
      logList.value = res.data
      total.value = res.total
    }
  } catch (e) {
    ElMessage.error('加载操作日志失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  loadData()
}

function handleReset() {
  filters.module = ''
  filters.action = ''
  filters.username = ''
  dateRange.value = null
  currentPage.value = 1
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.filter-card :deep(.el-card__body) {
  padding: 16px 20px 0;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-text {
  color: #64748b;
  font-size: 13px;
}

.detail-empty {
  color: #cbd5e1;
}

.detail-content {
  max-height: 400px;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-key {
  width: 120px;
  flex-shrink: 0;
  color: #64748b;
  font-size: 13px;
}

.detail-value {
  flex: 1;
  color: #1e293b;
  font-size: 13px;
  word-break: break-all;
}
</style>
