<template>
  <div class="role-permission">
    <el-row :gutter="24">
      <!-- 左侧角色列表 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <div class="view-tabs">
                <span
                  class="view-tab"
                  :class="{ active: currentView === 'active' }"
                  @click="currentView = 'active'; handleViewChange()"
                >角色列表</span>
                <span
                  class="view-tab"
                  :class="{ active: currentView === 'deleted' }"
                  @click="currentView = 'deleted'; handleViewChange()"
                >回收站</span>
              </div>
              <el-button
                v-if="currentView === 'active'"
                type="primary"
                size="small"
                v-permission="'role-create'"
                @click="handleAddRole"
              >
                <el-icon><Plus /></el-icon> 新增
              </el-button>
            </div>
          </template>

          <!-- 正常角色列表 -->
          <div v-if="currentView === 'active'" class="role-list">
            <div
              v-for="role in roleList"
              :key="role.id"
              :class="['role-item', { active: currentRoleId === role.id }]"
            >
              <div class="role-info" @click="selectRole(role)">
                <div class="role-name-row">
                  <span class="role-name">{{ role.name }}</span>
                  <span class="role-data-scope">{{ dataScopeMap[role.data_scope] || '未设置' }}</span>
                </div>
                <div class="role-desc">{{ role.description || '暂无描述' }}</div>
              </div>
              <div class="role-actions">
                <el-button type="primary" link size="small" v-permission="'role-edit'" @click.stop="handleEditRole(role)">
                  编辑
                </el-button>
                <el-button
                  v-if="role.type !== 'system'"
                  type="danger" link size="small"
                  v-permission="'role-delete'"
                  @click.stop="handleDeleteRole(role)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <el-empty v-if="roleList.length === 0" description="暂无角色" />
          </div>

          <!-- 回收站 -->
          <div v-else class="role-list">
            <div
              v-for="role in deletedRoles"
              :key="role.id"
              :class="['role-item deleted', { active: currentRoleId === role.id }]"
            >
              <div class="role-info" @click="selectRole(role)">
                <div class="role-name-row">
                  <span class="role-name">{{ role.name }}</span>
                  <span class="role-data-scope">{{ dataScopeMap[role.data_scope] || '未设置' }}</span>
                </div>
                <div class="role-desc">{{ role.description || '暂无描述' }}</div>
                <div class="role-deleted-at">删除时间：{{ role.deleted_at }}</div>
              </div>
              <div class="role-actions">
                <el-button type="success" link size="small" v-permission="'role-restore'" @click.stop="handleRestoreRole(role)">
                  恢复
                </el-button>
              </div>
            </div>
            <el-empty v-if="deletedRoles.length === 0" description="回收站为空" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧权限配置 -->
      <el-col :span="16">
        <el-card v-if="currentRoleId">
          <template #header>
            <span>权限配置 - {{ currentRole?.name }}<template v-if="currentView === 'deleted'">（只读）</template></span>
          </template>

          <el-tree
            ref="permissionTreeRef"
            :data="permissionTreeData"
            :props="treeProps"
            show-checkbox
            node-key="id"
            default-expand-all
            :default-checked-keys="checkedPermissionIds"
            :disabled="currentView === 'deleted'"
            :class="{ 'permission-tree-readonly': currentView === 'deleted' }"
          />

          <div v-if="currentView === 'active'" style="margin-top: 24px;">
            <el-button type="primary" v-permission="'role-edit'" :loading="saving" @click="handleSavePermissions">
              保存权限
            </el-button>
          </div>
        </el-card>
        <el-card v-else>
          <el-empty description="请选择角色" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增/编辑角色弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="数据权限" prop="data_scope">
          <el-select v-model="form.data_scope" placeholder="选择数据权限">
            <el-option label="全部数据" value="all" />
            <el-option label="本部门及下级部门" value="dept" />
            <el-option label="仅个人数据" value="self" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getRoleList, createRole, updateRole, deleteRole, restoreRole, getAllPermissions, getRolePermissions, updateRolePermissions } from '../api/roles'

const roleList = ref([])
const dataScopeMap = {
  all: '全部数据',
  dept: '本部门及下级部门',
  self: '仅个人数据'
}
const currentRoleId = ref(null)
const permissionTreeData = ref([])
const checkedPermissionIds = ref([])
const permissionTreeRef = ref(null)
const saving = ref(false)
const currentView = ref('active')
const deletedRoles = ref([])

const treeProps = computed(() => ({
  label: 'name',
  children: 'children',
  disabled: () => currentView.value === 'deleted'
}))

const dialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const isEdit = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const editId = ref(null)

const form = reactive({
  name: '',
  code: '',
  data_scope: 'self',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

const currentRole = computed(() => {
  return roleList.value.find(r => r.id === currentRoleId.value)
    || deletedRoles.value.find(r => r.id === currentRoleId.value)
})

function buildPermissionTree(flatList) {
  // 按 module 分组
  const moduleMap = {}
  flatList.forEach(p => {
    const mod = p.module || 'other'
    if (!moduleMap[mod]) {
      moduleMap[mod] = {
        id: `mod-${mod}`,
        name: moduleNameMap[mod] || mod,
        code: mod,
        children: []
      }
    }
    moduleMap[mod].children.push({
      id: p.id,
      name: p.name,
      code: p.code
    })
  })
  // 按菜单顺序返回
  const result = []
  moduleOrder.forEach(mod => {
    if (moduleMap[mod]) {
      result.push(moduleMap[mod])
    }
  })
  // 其他未在顺序中定义的模块（如有）
  Object.keys(moduleMap).forEach(mod => {
    if (!moduleOrder.includes(mod)) {
      result.push(moduleMap[mod])
    }
  })
  return result
}

// 菜单顺序：首页 → 角色权限 → 部门架构 → 用户
const moduleOrder = ['首页', '角色权限', '部门架构', '用户']

const moduleNameMap = {
  '首页': '首页',
  '角色权限': '角色权限',
  '部门架构': '部门架构',
  '用户': '用户管理'
}

async function loadRoleList() {
  try {
    const res = await getRoleList()
    if (res.success) {
      roleList.value = res.data
      if (res.data.length > 0 && !currentRoleId.value) {
        currentRoleId.value = res.data[0].id
      }
    }
  } catch (e) {
    ElMessage.error('加载角色列表失败')
  }
}

async function loadDeletedRoles() {
  try {
    const res = await getRoleList({ deleted: true })
    if (res.success) {
      deletedRoles.value = res.data
    }
  } catch (e) {
    ElMessage.error('加载已删除角色失败')
  }
}

async function loadAllPermissions() {
  try {
    const res = await getAllPermissions()
    if (res.success) {
      permissionTreeData.value = buildPermissionTree(res.data)
    }
  } catch (e) {
    ElMessage.error('加载权限列表失败')
  }
}

async function loadRolePermissions() {
  if (!currentRoleId.value) return
  
  try {
    const res = await getRolePermissions(currentRoleId.value)
    if (res.success) {
      const permIds = res.data.permissions ? res.data.permissions.map(p => p.id) : []
      checkedPermissionIds.value = permIds
      // el-tree 需要手动设置勾选状态（default-checked-keys 只在初始化时生效）
      // 使用 nextTick 确保 el-tree 已渲染
      nextTick(() => {
        if (permissionTreeRef.value) {
          permissionTreeRef.value.setCheckedKeys(permIds)
        }
      })
    }
  } catch (e) {
    ElMessage.error('加载权限失败')
  }
}

function selectRole(role) {
  currentRoleId.value = role.id
  loadRolePermissions()
}

function handleAddRole() {
  isEdit.value = false
  dialogTitle.value = '新增角色'
  Object.assign(form, {
    name: '',
    code: '',
    data_scope: 'self',
    description: ''
  })
  dialogVisible.value = true
}

function handleEditRole(role) {
  isEdit.value = true
  dialogTitle.value = '编辑角色'
  editId.value = role.id
  Object.assign(form, {
    name: role.name,
    code: role.code,
    data_scope: role.data_scope || 'self',
    description: role.description || ''
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    let res
    if (isEdit.value) {
      res = await updateRole(editId.value, form)
    } else {
      res = await createRole(form)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadRoleList()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteRole(role) {
  try {
    await ElMessageBox.confirm(
      `确定删除角色「${role.name}」吗？删除后可在回收站恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const res = await deleteRole(role.id)
    if (res.success) {
      ElMessage.success('删除成功')
      if (currentRoleId.value === role.id) {
        currentRoleId.value = null
      }
      loadRoleList()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  }
}

async function handleRestoreRole(role) {
  try {
    const res = await restoreRole(role.id)
    if (res.success) {
      ElMessage.success('恢复成功')
      loadDeletedRoles()
      loadRoleList()
    } else {
      ElMessage.error(res.message || '恢复失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  }
}

function handleViewChange() {
  if (currentView.value === 'active') {
    loadRoleList()
  } else {
    loadDeletedRoles()
  }
}

async function handleSavePermissions() {
  saving.value = true
  try {
    const checkedIds = permissionTreeRef.value.getCheckedKeys().filter(id => typeof id === 'number')
    const res = await updateRolePermissions(currentRoleId.value, checkedIds)
    if (res.success) {
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadAllPermissions()
  loadRoleList()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-list {
  max-height: 500px;
  overflow-y: auto;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
}

.role-item:hover {
  background: #f5f7fa;
}

.role-item.active {
  background: #ecfdf5;
  border-color: #10b981;
}

.role-info {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.role-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.role-name {
  font-weight: 500;
  color: #1e293b;
}

.role-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.role-data-scope {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.role-actions {
  flex-shrink: 0;
  margin-left: 12px;
}

.role-item.deleted {
  opacity: 0.75;
}

.role-deleted-at {
  font-size: 11px;
  color: #ef4444;
  margin-top: 2px;
}

.view-tabs {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.view-tab {
  font-size: 13px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.view-tab:hover {
  color: #64748b;
}

.view-tab.active {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 回收站只读模式 - 禁用 checkbox 交互 */
.permission-tree-readonly :deep(.el-checkbox__input) {
  pointer-events: none;
  cursor: default;
}

.permission-tree-readonly :deep(.el-tree-node__content) {
  cursor: default;
  color: #94a3b8;
}

.permission-tree-readonly :deep(.el-tree-node.is-current > .el-tree-node__content) {
  color: #94a3b8;
}
</style>
