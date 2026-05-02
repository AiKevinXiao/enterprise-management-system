<template>
  <div class="dashboard">
    <el-row :gutter="24">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <el-icon size="24"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">用户总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <el-icon size="24"><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalDepts }}</div>
            <div class="stat-label">部门数量</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <el-icon size="24"><Key /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalRoles }}</div>
            <div class="stat-label">角色数量</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
            <el-icon size="24"><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeUsers }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="24" style="margin-top: 24px;">
      <el-col :span="16">
        <el-card class="info-card">
          <template #header>
            <span class="card-title">系统信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="系统名称">企业管理系统</el-descriptions-item>
            <el-descriptions-item label="系统版本">v1.1.0</el-descriptions-item>
            <el-descriptions-item label="当前用户">{{ userName }}</el-descriptions-item>
            <el-descriptions-item label="用户角色">{{ userRole }}</el-descriptions-item>
            <el-descriptions-item label="数据权限">{{ dataScopeText }}</el-descriptions-item>
            <el-descriptions-item label="权限数量">{{ permissionCount }} 项</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="info-card">
          <template #header>
            <span class="card-title">快捷操作</span>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/users')" v-if="hasPermission('user-view')">
              <el-icon><User /></el-icon>
              用户管理
            </el-button>
            <el-button type="success" @click="$router.push('/departments')" v-if="hasPermission('dept-view')">
              <el-icon><OfficeBuilding /></el-icon>
              部门管理
            </el-button>
            <el-button type="warning" @click="$router.push('/roles')" v-if="hasPermission('role-view')">
              <el-icon><Key /></el-icon>
              角色权限
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { getUserList } from '../api/users'
import { getDepartmentList } from '../api/departments'
import { getRoleList } from '../api/roles'
import { User, OfficeBuilding, Key, CircleCheck } from '@element-plus/icons-vue'

const userStore = useUserStore()

const stats = ref({
  totalUsers: 0,
  totalDepts: 0,
  totalRoles: 0,
  activeUsers: 0
})

const userName = computed(() => userStore.name)
const userRole = computed(() => {
  const scope = userStore.dataScope
  const scopeMap = { all: '系统管理员', dept: '部门经理', self: '普通员工' }
  return scopeMap[scope] || '普通员工'
})
const dataScopeText = computed(() => {
  const scope = userStore.dataScope
  const scopeMap = { all: '全部数据', dept: '本部门及下级部门', self: '仅个人数据' }
  return scopeMap[scope] || '仅个人数据'
})
const permissionCount = computed(() => userStore.permissions.length)

function hasPermission(code) {
  return userStore.hasPermission(code)
}

onMounted(async () => {
  // 加载统计数据
  try {
    const [usersRes, deptsRes, rolesRes] = await Promise.all([
      getUserList({ page: 1, pageSize: 1 }),
      getDepartmentList(),
      getRoleList()
    ])
    
    if (usersRes.success) {
      stats.value.totalUsers = usersRes.data.total || 0
    }
    if (deptsRes.success) {
      stats.value.totalDepts = deptsRes.data.length || 0
    }
    if (rolesRes.success) {
      stats.value.totalRoles = rolesRes.data.length || 0
    }
    stats.value.activeUsers = Math.floor(stats.value.totalUsers * 0.8)
  } catch (e) {
    // ignore
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-content {
  margin-left: 16px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.info-card {
  height: 100%;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  width: 100%;
  justify-content: flex-start;
}
</style>
