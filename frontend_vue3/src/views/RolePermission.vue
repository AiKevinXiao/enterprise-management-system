<template>
  <div class="role-permission">
    <el-row :gutter="24">
      <!-- 左侧角色列表 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>角色列表</span>
              <el-button type="primary" size="small" v-permission="'role-create'" @click="handleAddRole">
                <el-icon><Plus /></el-icon> 新增
              </el-button>
            </div>
          </template>

          <div class="role-list">
            <div
              v-for="role in roleList"
              :key="role.id"
              :class="['role-item', { active: currentRoleId === role.id }]"
              @click="selectRole(role)"
            >
              <div class="role-name">{{ role.name }}</div>
              <div class="role-desc">{{ role.description || '暂无描述' }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧权限配置 -->
      <el-col :span="16">
        <el-card v-if="currentRoleId">
          <template #header>
            <span>权限配置 - {{ currentRole?.name }}</span>
          </template>

          <el-tree
            ref="permissionTreeRef"
            :data="permissionTreeData"
            :props="{ label: 'name', children: 'children' }"
            show-checkbox
            node-key="id"
            default-expand-all
            :default-checked-keys="checkedPermissionIds"
          />

          <div style="margin-top: 24px;">
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getRoleList, createRole, updateRole, getRolePermissions, updateRolePermissions } from '../api/roles'

const roleList = ref([])
const currentRoleId = ref(null)
const permissionTreeData = ref([])
const checkedPermissionIds = ref([])
const permissionTreeRef = ref(null)
const saving = ref(false)

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

const currentRole = computed(() => roleList.value.find(r => r.id === currentRoleId.value))

// 权限树数据（模拟，实际应从后端获取）
const mockPermissionTree = [
  {
    id: 1,
    name: '仪表盘',
    code: 'view-dashboard',
    children: []
  },
  {
    id: 2,
    name: '用户管理',
    code: 'user',
    children: [
      { id: 21, name: '查看用户', code: 'user-view' },
      { id: 22, name: '新增用户', code: 'user-create' },
      { id: 23, name: '编辑用户', code: 'user-edit' },
      { id: 24, name: '删除用户', code: 'user-delete' },
      { id: 25, name: '重置密码', code: 'user-reset-pwd' },
      { id: 26, name: '恢复用户', code: 'user-restore' }
    ]
  },
  {
    id: 3,
    name: '部门管理',
    code: 'dept',
    children: [
      { id: 31, name: '查看部门', code: 'dept-view' },
      { id: 32, name: '新增部门', code: 'dept-create' },
      { id: 33, name: '编辑部门', code: 'dept-edit' },
      { id: 34, name: '删除部门', code: 'dept-delete' }
    ]
  },
  {
    id: 4,
    name: '角色权限',
    code: 'role',
    children: [
      { id: 41, name: '查看角色', code: 'role-view' },
      { id: 42, name: '新增角色', code: 'role-create' },
      { id: 43, name: '编辑角色', code: 'role-edit' },
      { id: 44, name: '删除角色', code: 'role-delete' }
    ]
  }
]

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

async function loadRolePermissions() {
  if (!currentRoleId.value) return
  
  try {
    const res = await getRolePermissions(currentRoleId.value)
    if (res.success) {
      checkedPermissionIds.value = res.data.map(p => p.id)
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

async function handleSavePermissions() {
  saving.value = true
  try {
    const checkedIds = permissionTreeRef.value.getCheckedKeys()
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
  permissionTreeData.value = mockPermissionTree
  loadRoleList()
})

watch(currentRoleId, () => {
  loadRolePermissions()
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
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
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

.role-name {
  font-weight: 500;
  color: #1e293b;
}

.role-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
