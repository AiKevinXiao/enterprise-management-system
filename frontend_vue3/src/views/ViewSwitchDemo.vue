<template>
  <div class="demo-page">
    <h1>视图切换方案对比</h1>
    <p class="desc">当前登录用户: <strong>{{ userName }}</strong>，权限: {{ userPermissions.join(', ') || '无' }}</p>
    <p class="desc">是否有 user-restore 权限: <strong>{{ hasRestorePerm ? '是' : '否' }}</strong></p>
    
    <el-divider />
    
    <!-- 方案导航 -->
    <section class="nav-section">
      <h2>方案导航（超链接跳转）</h2>
      <div class="nav-links">
        <el-link href="#scheme1" type="primary">方案1: v-if</el-link>
        <el-divider direction="vertical" />
        <el-link href="#scheme2" type="primary">方案2: el-segmented</el-link>
        <el-divider direction="vertical" />
        <el-link href="#scheme3" type="primary">方案3: 自定义按钮</el-link>
        <el-divider direction="vertical" />
        <el-link href="#scheme4" type="primary">方案4: el-tabs</el-link>
        <el-divider direction="vertical" />
        <el-link href="#scheme5" type="primary">方案5: CSS hack</el-link>
        <el-divider direction="vertical" />
        <el-link href="#summary" type="success">对比总结</el-link>
      </div>
    </section>
    
    <el-divider />

    <!-- 方案1: v-if + checkPermission -->
    <section id="scheme1" class="demo-section">
      <h2>方案1: el-radio-group + v-if</h2>
      <p class="approach-desc">用 v-if 直接移除无权限的按钮，Element Plus 自动识别单按钮加四角圆角</p>
      <div class="demo-content">
        <el-radio-group v-model="view1" @change="handleChange1">
          <el-radio-button value="active">用户列表</el-radio-button>
          <el-radio-button v-if="hasRestorePerm" value="deleted">回收站</el-radio-button>
        </el-radio-group>
        <span class="result">当前视图: {{ view1 }}</span>
      </div>
      <!-- 方案1 内容区 -->
      <div class="view-content">
        <div v-if="view1 === 'active'" class="content-box active-content">
          <p>📋 用户列表内容</p>
          <p>显示所有正常用户，支持编辑、删除、重置密码等操作</p>
        </div>
        <div v-else class="content-box deleted-content">
          <p>🗑️ 回收站内容</p>
          <p>显示已删除用户，支持恢复操作</p>
        </div>
      </div>
    </section>

    <el-divider />

    <!-- 方案2: el-segmented (当前采用) -->
    <section id="scheme2" class="demo-section">
      <h2>方案2: el-segmented (当前采用)</h2>
      <p class="approach-desc">Element Plus 2.5+ 分段控制器，computed 动态生成 options，单选项自动满圆角</p>
      <div class="demo-content">
        <el-segmented v-model="view2" :options="viewOptions2" @change="handleChange2" />
        <span class="result">当前视图: {{ view2 }}</span>
      </div>
      <!-- 方案2 内容区 -->
      <div class="view-content">
        <div v-if="view2 === 'active'" class="content-box active-content">
          <p>📋 用户列表内容</p>
          <p>显示所有正常用户，支持编辑、删除、重置密码等操作</p>
        </div>
        <div v-else class="content-box deleted-content">
          <p>🗑️ 回收站内容</p>
          <p>显示已删除用户，支持恢复操作</p>
        </div>
      </div>
    </section>

    <el-divider />

    <!-- 方案3: 自定义按钮组 -->
    <section id="scheme3" class="demo-section">
      <h2>方案3: 自定义按钮组 (el-button)</h2>
      <p class="approach-desc">手写 el-button + CSS，完全控制样式和圆角</p>
      <div class="demo-content">
        <div class="custom-btn-group">
          <el-button 
            :type="view3 === 'active' ? 'primary' : 'default'"
            :class="{ 'active-btn': view3 === 'active' }"
            @click="view3 = 'active'"
          >用户列表</el-button>
          <el-button 
            v-if="hasRestorePerm"
            :type="view3 === 'deleted' ? 'primary' : 'default'"
            :class="{ 'active-btn': view3 === 'deleted' }"
            @click="view3 = 'deleted'"
          >回收站</el-button>
        </div>
        <span class="result">当前视图: {{ view3 }}</span>
      </div>
      <!-- 方案3 内容区 -->
      <div class="view-content">
        <div v-if="view3 === 'active'" class="content-box active-content">
          <p>📋 用户列表内容</p>
          <p>显示所有正常用户，支持编辑、删除、重置密码等操作</p>
        </div>
        <div v-else class="content-box deleted-content">
          <p>🗑️ 回收站内容</p>
          <p>显示已删除用户，支持恢复操作</p>
        </div>
      </div>
    </section>

    <el-divider />

    <!-- 方案4: el-tabs -->
    <section id="scheme4" class="demo-section">
      <h2>方案4: el-tabs</h2>
      <p class="approach-desc">语义化标签页，适合内容区分明显的场景</p>
      <div class="demo-content">
        <el-tabs v-model="view4" type="card" @tab-change="handleChange4">
          <el-tab-pane label="用户列表" name="active">
            <div class="content-box active-content">
              <p>📋 用户列表内容</p>
              <p>显示所有正常用户，支持编辑、删除、重置密码等操作</p>
            </div>
          </el-tab-pane>
          <el-tab-pane v-if="hasRestorePerm" label="回收站" name="deleted">
            <div class="content-box deleted-content">
              <p>🗑️ 回收站内容</p>
              <p>显示已删除用户，支持恢复操作</p>
            </div>
          </el-tab-pane>
        </el-tabs>
        <span class="result">当前视图: {{ view4 }}</span>
      </div>
    </section>

    <el-divider />

    <!-- 方案5: CSS hack (原问题方案) -->
    <section id="scheme5" class="demo-section">
      <h2>方案5: CSS hack (原问题，仅演示)</h2>
      <p class="approach-desc">v-permission 用 display:none 隐藏，DOM 仍在，需 CSS 修复圆角。此方案有问题！</p>
      <div class="demo-content">
        <el-radio-group v-model="view5" class="hack-radio-group" @change="handleChange5">
          <el-radio-button value="active">用户列表</el-radio-button>
          <el-radio-button v-permission="'user-restore'" value="deleted">回收站</el-radio-button>
        </el-radio-group>
        <span class="result">当前视图: {{ view5 }} <span class="warning" v-if="!hasRestorePerm">(注意: 右圆角缺失!)</span></span>
      </div>
      <!-- 方案5 内容区 -->
      <div class="view-content">
        <div v-if="view5 === 'active'" class="content-box active-content">
          <p>📋 用户列表内容</p>
          <p>显示所有正常用户，支持编辑、删除、重置密码等操作</p>
        </div>
        <div v-else class="content-box deleted-content">
          <p>🗑️ 回收站内容</p>
          <p>显示已删除用户，支持恢复操作</p>
        </div>
      </div>
    </section>

    <el-divider />

    <!-- 总结 -->
    <section id="summary" class="summary-section">
      <h2>方案对比总结</h2>
      <el-table :data="comparisonData" border>
        <el-table-column prop="name" label="方案" width="200" />
        <el-table-column prop="pros" label="优点" />
        <el-table-column prop="cons" label="缺点" />
        <el-table-column prop="recommend" label="推荐度" width="100">
          <template #default="{ row }">
            <el-tag :type="row.tagType">{{ row.recommend }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const userName = computed(() => userStore.name || userStore.username)
const userPermissions = computed(() => userStore.permissions)
const hasRestorePerm = computed(() => userStore.hasPermission('user-restore'))

// 方案1
const view1 = ref('active')
function handleChange1(val) {
  console.log('方案1 切换:', val)
}

// 方案2
const view2 = ref('active')
const viewOptions2 = computed(() => {
  const options = [{ label: '用户列表', value: 'active' }]
  if (hasRestorePerm.value) {
    options.push({ label: '回收站', value: 'deleted' })
  }
  return options
})
function handleChange2(val) {
  console.log('方案2 切换:', val)
}

// 方案3
const view3 = ref('active')

// 方案4
const view4 = ref('active')
function handleChange4(val) {
  console.log('方案4 切换:', val)
}

// 方案5
const view5 = ref('active')
function handleChange5(val) {
  console.log('方案5 切换:', val)
}

// 对比表格数据
const comparisonData = [
  {
    name: '方案1: v-if',
    pros: '一行改动，DOM 直接移除，EP 自动处理样式',
    cons: '每次权限判断都要写 v-if',
    recommend: '推荐',
    tagType: 'success'
  },
  {
    name: '方案2: el-segmented',
    pros: '现代 UI，滑块动画，computed 动态选项',
    cons: 'EP 2.5+ 才有，旧项目不可用',
    recommend: '推荐',
    tagType: 'success'
  },
  {
    name: '方案3: 自定义按钮',
    pros: '完全控制样式，灵活度高',
    cons: '需手写 CSS，维护成本高',
    recommend: '一般',
    tagType: 'warning'
  },
  {
    name: '方案4: el-tabs',
    pros: '语义化，适合内容区分场景',
    cons: '占用空间大，不适合紧凑 UI',
    recommend: '一般',
    tagType: 'warning'
  },
  {
    name: '方案5: CSS hack',
    pros: '无需改动模板结构',
    cons: 'DOM 仍在，需额外 CSS，易出问题',
    recommend: '不推荐',
    tagType: 'danger'
  }
]
</script>

<style scoped>
.demo-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.desc {
  color: #666;
  margin: 4px 0;
}

.demo-section {
  margin: 20px 0;
}

.demo-section h2 {
  font-size: 18px;
  margin-bottom: 8px;
}

.approach-desc {
  color: #888;
  font-size: 14px;
  margin-bottom: 16px;
}

.demo-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.result {
  color: #409eff;
  font-weight: 500;
}

.warning {
  color: #f56c6c;
  font-weight: normal;
}

/* 方案3 自定义按钮组样式 */
.custom-btn-group {
  display: inline-flex;
}

.custom-btn-group .el-button {
  border-radius: 0;
}

.custom-btn-group .el-button:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.custom-btn-group .el-button:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.custom-btn-group .el-button + .el-button {
  margin-left: 0;
  border-left: none;
}

.active-btn {
  font-weight: 600;
}

/* 方案5 CSS hack (演示用，实际有问题) */
.hack-radio-group :deep(.el-radio-button:first-child .el-radio-button__inner) {
  /* 尝试修复圆角，但无法完全解决 */
  border-radius: 4px 0 0 4px;
}

.summary-section {
  margin-top: 40px;
}

.summary-section h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

/* 导航区域样式 */
.nav-section {
  margin: 20px 0;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.nav-section h2 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #303133;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

/* 视图内容区样式 */
.view-content {
  margin-top: 16px;
}

.content-box {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.active-content {
  background: #ecf5ff;
  border-color: #409eff;
}

.deleted-content {
  background: #fef0f0;
  border-color: #f56c6c;
}

.content-box p {
  margin: 4px 0;
  color: #606266;
}

.content-box p:first-child {
  font-weight: 600;
  font-size: 16px;
}
</style>
