<template>
  <div class="import-export-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据导入导出</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="module-tabs">
        <!-- 用户导入导出 -->
        <el-tab-pane label="用户管理" name="users">
          <div class="module-section">
            <div class="section-title">用户列表导出</div>
            <div class="action-row">
              <el-button type="primary" @click="handleExport('users')" :loading="exporting.user">
                <el-icon><Download /></el-icon> 导出用户
              </el-button>
            </div>

            <el-divider />
            <div class="section-title">批量导入用户</div>
            <p class="hint">支持 .xlsx/.xls 格式，请先导出获取模板格式</p>
            <div class="upload-area">
              <el-upload
                ref="userUploadRef"
                :auto-upload="false"
                :limit="1"
                accept=".xlsx,.xls"
                :on-change="(f) => userFile = f.raw"
                :on-exceed="() => ElMessage.warning('每次只能上传1个文件')"
              >
                <template #trigger>
                  <el-button><el-icon><Upload /></el-icon> 选择文件</el-button>
                </template>
                <el-button type="primary" style="margin-left:8px" :loading="importing.user" :disabled="!userFile"
                  @click="submitImport('users')">
                  开始导入
                </el-button>
              </el-upload>
            </div>

            <!-- 导入结果 -->
            <div v-if="importResult.user" class="import-result" :class="importResult.user.success ? 'success' : 'error'">
              <div class="result-title">{{ importResult.user.success ? '✅ 导入完成' : '❌ 导入失败' }}</div>
              <div v-if="importResult.user.message" class="result-message">{{ importResult.user.message }}</div>
              <div v-if="importResult.user.errors?.length" class="result-details">
                <div class="details-title">错误明细：</div>
                <el-tag v-for="(e, i) in importResult.user.errors.slice(0, 5)" :key="i" type="danger" size="small" style="margin:2px">
                  第{{ e.row }}行: {{ e.错误 }}
                </el-tag>
                <div v-if="importResult.user.errors.length > 5" style="color:#999;font-size:12px;margin-top:4px">
                  还有 {{ importResult.user.errors.length - 5 }} 条错误未显示
                </div>
              </div>
              <div v-if="importResult.user.existSkip?.length" class="result-details">
                <div class="details-title">跳过（已存在）：</div>
                <el-tag v-for="(s, i) in importResult.user.existSkip" :key="i" type="warning" size="small" style="margin:2px">
                  第{{ s.row }}行: {{ s.用户名 }} - {{ s.原因 }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 部门导入导出 -->
        <el-tab-pane label="部门管理" name="departments">
          <div class="module-section">
            <div class="section-title">部门列表导出</div>
            <div class="action-row">
              <el-button type="primary" @click="handleExport('departments')" :loading="exporting.dept">
                <el-icon><Download /></el-icon> 导出部门
              </el-button>
            </div>

            <el-divider />
            <div class="section-title">批量导入部门</div>
            <p class="hint">支持 .xlsx/.xls 格式，请先导出获取模板格式</p>
            <div class="upload-area">
              <el-upload
                ref="deptUploadRef"
                :auto-upload="false"
                :limit="1"
                accept=".xlsx,.xls"
                :on-change="(f) => deptFile = f.raw"
                :on-exceed="() => ElMessage.warning('每次只能上传1个文件')"
              >
                <template #trigger>
                  <el-button><el-icon><Upload /></el-icon> 选择文件</el-button>
                </template>
                <el-button type="primary" style="margin-left:8px" :loading="importing.dept" :disabled="!deptFile"
                  @click="submitImport('departments')">
                  开始导入
                </el-button>
              </el-upload>
            </div>

            <div v-if="importResult.dept" class="import-result" :class="importResult.dept.success ? 'success' : 'error'">
              <div class="result-title">{{ importResult.dept.success ? '✅ 导入完成' : '❌ 导入失败' }}</div>
              <div v-if="importResult.dept.message" class="result-message">{{ importResult.dept.message }}</div>
              <div v-if="importResult.dept.errors?.length" class="result-details">
                <el-tag v-for="(e, i) in importResult.dept.errors.slice(0, 5)" :key="i" type="danger" size="small" style="margin:2px">
                  第{{ e.row }}行: {{ e.错误 || e.原因 }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 角色导入导出 -->
        <el-tab-pane label="角色管理" name="roles">
          <div class="module-section">
            <div class="section-title">角色列表导出</div>
            <div class="action-row">
              <el-button type="primary" @click="handleExport('roles')" :loading="exporting.role">
                <el-icon><Download /></el-icon> 导出角色
              </el-button>
            </div>

            <el-divider />
            <div class="section-title">批量导入角色</div>
            <p class="hint">支持 .xlsx/.xls 格式，请先导出获取模板格式</p>
            <div class="upload-area">
              <el-upload
                ref="roleUploadRef"
                :auto-upload="false"
                :limit="1"
                accept=".xlsx,.xls"
                :on-change="(f) => roleFile = f.raw"
                :on-exceed="() => ElMessage.warning('每次只能上传1个文件')"
              >
                <template #trigger>
                  <el-button><el-icon><Upload /></el-icon> 选择文件</el-button>
                </template>
                <el-button type="primary" style="margin-left:8px" :loading="importing.role" :disabled="!roleFile"
                  @click="submitImport('roles')">
                  开始导入
                </el-button>
              </el-upload>
            </div>

            <div v-if="importResult.role" class="import-result" :class="importResult.role.success ? 'success' : 'error'">
              <div class="result-title">{{ importResult.role.success ? '✅ 导入完成' : '❌ 导入失败' }}</div>
              <div v-if="importResult.role.message" class="result-message">{{ importResult.role.message }}</div>
              <div v-if="importResult.role.errors?.length" class="result-details">
                <el-tag v-for="(e, i) in importResult.role.errors.slice(0, 5)" :key="i" type="danger" size="small" style="margin:2px">
                  第{{ e.row }}行: {{ e.错误 || e.原因 }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Upload } from '@element-plus/icons-vue'
import {
  exportUsers, exportDepartments, exportRoles,
  importUsers, importDepartments, importRoles
} from '../api/importExport'

const activeTab = ref('users')

// 文件状态
const userFile = ref(null)
const deptFile = ref(null)
const roleFile = ref(null)
const userUploadRef = ref(null)
const deptUploadRef = ref(null)
const roleUploadRef = ref(null)

// 导出状态
const exporting = reactive({ user: false, dept: false, role: false })
// 导入状态
const importing = reactive({ user: false, dept: false, role: false })
// 导入结果
const importResult = reactive({ user: null, dept: null, role: null })

// 导出
async function handleExport(type) {
  const exporters = { users: exportUsers, departments: exportDepartments, roles: exportRoles }
  const names = { users: '用户', departments: '部门', roles: '角色' }
  const key = type === 'users' ? 'user' : type === 'departments' ? 'dept' : 'role'
  exporting[key] = true
  try {
    const res = await exporters[type]()
    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${names[type]}列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`${names[type]}导出成功`)
  } catch (e) {
    ElMessage.error(`${names[type]}导出失败`)
  } finally {
    exporting[key] = false
  }
}

// 导入
async function submitImport(type) {
  const fileMap = { users: userFile, departments: deptFile, roles: roleFile }
  const uploadMap = { users: userUploadRef, departments: deptUploadRef, roles: roleUploadRef }
  const importers = { users: importUsers, departments: importDepartments, roles: importRoles }
  const names = { users: '用户', departments: '部门', roles: '角色' }
  const key = type === 'users' ? 'user' : type === 'departments' ? 'dept' : 'role'

  const file = fileMap[type].value
  if (!file) {
    ElMessage.warning('请先选择文件')
    return
  }

  importing[key] = true
  importResult[key] = null
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await importers[type](formData)
    importResult[key] = res
    if (res.success !== false) {
      ElMessage.success(res.message || '导入完成')
    } else {
      ElMessage.error(res.message || '导入失败')
    }
  } catch (e) {
    importResult[key] = { success: false, message: '网络错误，请重试' }
    ElMessage.error('网络错误')
  } finally {
    importing[key] = false
  }
}
</script>

<style scoped>
.import-export-page {
  padding: 0;
}

.module-tabs {
  user-select: none;
}

.module-section {
  padding: 8px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.action-row {
  margin-bottom: 8px;
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin: -8px 0 12px;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.import-result {
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 8px;
}

.import-result.success {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.import-result.error {
  background: #fef0f0;
  border: 1px solid #fde2e2;
}

.result-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.result-message {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.result-details {
  margin-top: 8px;
}

.details-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
</style>
