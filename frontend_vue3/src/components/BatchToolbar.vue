<template>
  <div class="batch-toolbar">
    <!-- 批量操作 + 新增/导入/导出 -->
    <div class="toolbar-left">
      <template v-if="currentView === 'active'">
        <template v-if="selection && selection.length">
          <!-- 批量删除 -->
          <el-button
            v-if="showBatchDelete"
            type="danger"
            :disabled="!hasPermission('batch-delete')"
            @click="emit('batch-delete', selection)"
          >
            <el-icon><Delete /></el-icon> 批量删除
          </el-button>
          <!-- 批量禁用 -->
          <el-button
            v-if="showBatchDisable"
            :disabled="!hasPermission('batch-disable')"
            @click="emit('batch-disable', selection)"
          >
            批量禁用
          </el-button>
          <!-- 批量启用 -->
          <el-button
            v-if="showBatchEnable"
            :disabled="!hasPermission('batch-enable')"
            @click="emit('batch-enable', selection)"
          >
            批量启用
          </el-button>
          <span class="selection-tip">已选 {{ selection.length }} 项</span>
        </template>

        <!-- 新增按钮 -->
        <el-button
          v-if="showAdd"
          type="primary"
          :disabled="!hasPermission('add')"
          @click="emit('add')"
        >
          <el-icon><Plus /></el-icon> {{ addLabel }}
        </el-button>

        <!-- 导入按钮 -->
        <el-popover
          v-if="showImport"
          placement="bottom-end"
          :width="340"
          trigger="click"
          :disabled="!hasPermission('import')"
        >
          <template #reference>
            <el-button :disabled="!hasPermission('import')">
              <el-icon><Upload /></el-icon> 导入
            </el-button>
          </template>
          <div class="import-panel">
            <p class="import-tip">请下载模板，填写后上传</p>
            <el-button size="small" @click="handleDownloadTemplate" style="width:100%;margin-bottom:12px;">
              <el-icon><Download /></el-icon> 下载{{ moduleLabel }}模板
            </el-button>
            <el-upload
              ref="uploadRef"
              :limit="1"
              accept=".xlsx,.xls"
              :auto-upload="false"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              drag
            >
              <el-icon><UploadFilled /></el-icon>
              <div>或将文件拖到此处<br><span style="font-size:12px;color:#999">仅支持 .xlsx / .xls</span></div>
            </el-upload>
            <div class="import-actions">
              <el-button
                type="primary"
                size="small"
                :disabled="!selectedFile"
                :loading="importing"
                @click="handleImport"
              >
                确认导入
              </el-button>
              <el-button size="small" @click="importPopoverVisible = false">取消</el-button>
            </div>
          </div>
        </el-popover>

        <!-- 导出按钮 -->
        <el-button
          v-if="showExport"
          :disabled="!hasPermission('export')"
          @click="handleExport"
        >
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </template>

      <!-- 回收站视图：批量恢复 -->
      <template v-else-if="currentView === 'deleted'">
        <template v-if="selection && selection.length">
          <el-button
            v-if="showBatchRestore"
            type="success"
            :disabled="!hasPermission('batch-restore')"
            @click="emit('batch-restore', selection)"
          >
            <el-icon><RefreshRight /></el-icon> 批量恢复
          </el-button>
          <span class="selection-tip">已选 {{ selection.length }} 项</span>
        </template>
      </template>
    </div>
  </div>

  <!-- 导入结果 Dialog -->
  <el-dialog v-model="resultDialogVisible" title="导入结果" width="500px" destroy-on-close>
    <div v-if="importResult" class="import-result">
      <el-statistic title="成功" :value="importResult.success" value-style="color:#67c23a;font-size:28px;" />
      <el-statistic title="跳过" :value="importResult.skipped" value-style="color:#e6a23c;font-size:28px;" />
      <el-statistic title="失败" :value="importResult.failed" value-style="color:#f56c6c;font-size:28px;" />
      <el-divider v-if="importResult.errors && importResult.errors.length" />
      <div v-if="importResult.errors && importResult.errors.length" class="error-list">
        <p style="color:#f56c6c;margin-bottom:8px;font-weight:500;">失败详情：</p>
        <ul>
          <li v-for="(err, i) in importResult.errors" :key="i" style="font-size:13px;color:#666;margin-bottom:4px;">
            第{{ err.row }}行：{{ err.message }}
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="resultDialogVisible = false">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { exportUsers, exportDepartments, exportRoles, importUsers, importDepartments, importRoles } from '../api/importExport'
import { useUserStore } from '../stores/user'

const props = defineProps({
  module: { type: String, required: true }, // 'users' | 'departments' | 'roles'
  selection: { type: Array, default: () => [] },
  currentView: { type: String, default: 'active' },
  // 权限前缀，如 'user-'、'dept-'、'role-'
  permissionPrefix: { type: String, default: '' },
  // 是否显示各按钮
  showBatchDelete: { type: Boolean, default: true },
  showBatchDisable: { type: Boolean, default: true },
  showBatchEnable: { type: Boolean, default: true },
  showBatchRestore: { type: Boolean, default: false },
  showAdd: { type: Boolean, default: true },
  showImport: { type: Boolean, default: true },
  showExport: { type: Boolean, default: true },
  addLabel: { type: String, default: '新增' },
  // 模板文件名（相对于 /public/templates/）
  templateFile: { type: String, default: '' },
})

const emit = defineEmits([
  'batch-delete', 'batch-disable', 'batch-enable', 'batch-restore', 'add', 'import', 'import-success'
])

const userStore = useUserStore()
const importPopoverVisible = ref(false)
const uploadRef = ref(null)
const selectedFile = ref(null)
const importing = ref(false)
const resultDialogVisible = ref(false)
const importResult = ref(null)

const moduleMap = {
  users: { label: '用户', exportFn: exportUsers, importFn: importUsers },
  departments: { label: '部门', exportFn: exportDepartments, importFn: importDepartments },
  roles: { label: '角色', exportFn: exportRoles, importFn: importRoles },
}

const moduleLabel = computed(() => moduleMap[props.module]?.label || '')

// 权限码映射：按钮 action -> 数据库权限码
const ACTION_PERM_MAP = {
  'add': 'create',
  'batch-delete': 'delete',
  'batch-disable': 'edit', // 禁用视为编辑权限
  'batch-enable': 'edit',
  'batch-restore': 'restore',
  'import': 'import',
  'export': 'export',
}

function hasPermission(action) {
  const permCode = ACTION_PERM_MAP[action] || action
  const code = props.permissionPrefix + permCode
  return userStore.hasPermission(code)
}

function handleDownloadTemplate() {
  // 如果有专门的模板文件则下载，否则通过导出空数据生成模板
  if (props.templateFile) {
    const link = document.createElement('a')
    link.href = props.templateFile
    link.download = `${moduleLabel.value}导入模板.xlsx`
    link.click()
  } else {
    // 通过导出当前空列表来获取模板
    moduleMap[props.module].exportFn().then(blob => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${moduleLabel.value}导入模板.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    }).catch(() => {
      ElMessage.error('获取模板失败')
    })
  }
}

function handleFileChange(file) {
  selectedFile.value = file.raw
}

function handleFileRemove() {
  selectedFile.value = null
}

function handleExport() {
  moduleMap[props.module].exportFn().then(blob => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
    link.download = `${moduleLabel.value}_导出_${ts}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }).catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleImport() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  importing.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  moduleMap[props.module].importFn(formData).then(res => {
    importing.value = false
    if (res.success) {
      // 后端返回 { message, success: [...], existSkip: [...], errors: [...] }
      const data = res.data || {}
      importResult.value = {
        success: Array.isArray(data.success) ? data.success.length : 0,
        skipped: Array.isArray(data.existSkip) ? data.existSkip.length : 0,
        failed: Array.isArray(data.errors) ? data.errors.length : 0,
        errors: data.errors || [],
      }
      resultDialogVisible.value = true
      importPopoverVisible.value = false
      selectedFile.value = null
      if (uploadRef.value) uploadRef.value.clearFiles()
      emit('import-success')
    } else {
      ElMessage.error(res.message || '导入失败')
    }
  }).catch(err => {
    importing.value = false
    ElMessage.error(err.message || '导入失败')
  })
}

function openImport() {
  importPopoverVisible.value = true
}

defineExpose({ openImport, importPopoverVisible })

</script>

<script>
import { computed } from 'vue'
export default { name: 'BatchToolbar' }
</script>

<style scoped>
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.selection-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}
.import-panel {
  padding: 4px 0;
}
.import-tip {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
.import-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.error-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
