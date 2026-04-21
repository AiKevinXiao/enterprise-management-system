<template>
  <div class="user-management">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/用户名/手机号" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="searchForm.dept_id"
            :data="deptTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="选择部门"
            clearable
            check-strictly
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable>
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
            <el-option label="待审核" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <el-radio-group v-model="currentView" @change="handleViewChange">
            <el-radio-button value="active">用户列表</el-radio-button>
            <el-radio-button value="deleted">回收站</el-radio-button>
          </el-radio-group>
          <div class="table-actions" v-if="currentView === 'active'">
            <el-button type="primary" v-permission="'user-create'" @click="handleAdd">
              <el-icon><Plus /></el-icon> 新增用户
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" class="user-avatar">{{ row.name.charAt(0) }}</el-avatar>
              <div class="user-info">
                <span class="user-name">{{ row.name }}</span>
                <span class="user-account">{{ row.username }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="dept_name" label="部门" min-width="120" />
        <el-table-column prop="role_name" label="角色" min-width="100" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_login" label="最后登录" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="currentView === 'active'">
              <el-button link type="primary" v-permission="'user-edit'" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="warning" v-permission="'user-reset-pwd'" @click="handleResetPwd(row)">重置密码</el-button>
              <el-button link type="danger" v-permission="'user-delete'" @click="handleDelete(row)">删除</el-button>
            </template>
            <template v-else>
              <el-button link type="success" v-permission="'user-restore'" @click="handleRestore(row)">恢复</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑用户弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="部门" prop="dept_id">
          <el-tree-select
            v-model="form.dept_id"
            :data="deptTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="选择部门"
            check-strictly
          />
        </el-form-item>
        <el-form-item label="角色" prop="role_id">
          <el-select v-model="form.role_id" placeholder="选择角色">
            <el-option v-for="role in roleList" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="选择状态">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
            <el-option label="待审核" value="pending" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px">
      <el-form ref="resetPwdRef" :model="resetPwdForm" :rules="resetPwdRules" label-width="80px">
        <el-form-item label="用户">
          <el-input :value="resetPwdUser" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="resetPwdForm.password" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetting" @click="handleResetPwdSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { getUserList, createUser, updateUser, deleteUser, restoreUser, resetPassword } from '../api/users'
import { getDepartmentList } from '../api/departments'
import { getRoleList } from '../api/roles'

// 数据状态
const loading = ref(false)
const tableData = ref([])
const deptTree = ref([])
const roleList = ref([])
const currentView = ref('active')
const selectedRows = ref([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  dept_id: null,
  status: null
})

// 弹窗状态
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const isEdit = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const editId = ref(null)

const form = reactive({
  name: '',
  username: '',
  password: '',
  dept_id: null,
  role_id: null,
  phone: '',
  email: '',
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  dept_id: [{ required: true, message: '请选择部门', trigger: 'change' }],
  role_id: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

// 重置密码
const resetPwdVisible = ref(false)
const resetPwdRef = ref(null)
const resetPwdUser = ref('')
const resetPwdUserId = ref(null)
const resetting = ref(false)
const resetPwdForm = reactive({ password: '' })
const resetPwdRules = {
  password: [{ required: true, message: '请输入新密码', trigger: 'blur' }]
}

// 方法
function getStatusType(status) {
  const map = { active: 'success', disabled: 'danger', pending: 'warning' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { active: '正常', disabled: '禁用', pending: '待审核' }
  return map[status] || status
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      deleted: currentView.value === 'deleted'
    }
    if (searchForm.keyword) params.keyword = searchForm.keyword
    if (searchForm.dept_id) params.dept_id = searchForm.dept_id
    if (searchForm.status) params.status = searchForm.status

    const res = await getUserList(params)
    if (res.success) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

async function loadDeptTree() {
  try {
    const res = await getDepartmentList()
    if (res.success) {
      deptTree.value = buildTree(res.data)
    }
  } catch (e) {
    // ignore
  }
}

function buildTree(list, parentId = null) {
  return list
    .filter(item => item.parent_id === parentId)
    .map(item => ({
      ...item,
      children: buildTree(list, item.id)
    }))
}

async function loadRoleList() {
  try {
    const res = await getRoleList()
    if (res.success) {
      roleList.value = res.data
    }
  } catch (e) {
    // ignore
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.dept_id = null
  searchForm.status = null
  handleSearch()
}

function handleViewChange() {
  pagination.page = 1
  loadData()
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function handleAdd() {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  Object.assign(form, {
    name: '',
    username: '',
    password: '',
    dept_id: null,
    role_id: null,
    phone: '',
    email: '',
    status: 'active'
  })
  dialogVisible.value = true
}

function handleEdit(row) {
  isEdit.value = true
  dialogTitle.value = '编辑用户'
  editId.value = row.id
  Object.assign(form, {
    name: row.name,
    username: row.username,
    dept_id: row.dept_id,
    role_id: row.role_id,
    phone: row.phone || '',
    email: row.email || '',
    status: row.status
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
      res = await updateUser(editId.value, form)
    } else {
      res = await createUser(form)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.name}" 吗？`, '提示', {
      type: 'warning'
    })
    const res = await deleteUser(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    // 取消删除
  }
}

async function handleRestore(row) {
  try {
    await ElMessageBox.confirm(`确定要恢复用户 "${row.name}" 吗？`, '提示', {
      type: 'info'
    })
    const res = await restoreUser(row.id)
    if (res.success) {
      ElMessage.success('恢复成功')
      loadData()
    } else {
      ElMessage.error(res.message || '恢复失败')
    }
  } catch (e) {
    // 取消恢复
  }
}

function handleResetPwd(row) {
  resetPwdUser.value = row.name
  resetPwdUserId.value = row.id
  resetPwdForm.password = ''
  resetPwdVisible.value = true
}

async function handleResetPwdSubmit() {
  const valid = await resetPwdRef.value.validate().catch(() => false)
  if (!valid) return

  resetting.value = true
  try {
    const res = await resetPassword(resetPwdUserId.value, resetPwdForm.password)
    if (res.success) {
      ElMessage.success('密码重置成功')
      resetPwdVisible.value = false
    } else {
      ElMessage.error(res.message || '重置失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    resetting.value = false
  }
}

onMounted(() => {
  loadData()
  loadDeptTree()
  loadRoleList()
})
</script>

<style scoped>
.user-management {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
}

.search-form {
  margin-bottom: -18px;
}

.table-card {
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-cell {
  display: flex;
  align-items: center;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-weight: 600;
}

.user-info {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: #1e293b;
}

.user-account {
  font-size: 12px;
  color: #94a3b8;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
