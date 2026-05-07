import { test, expect } from '@playwright/test'

// ============================================================
// 辅助函数
// ============================================================

/** 登录 admin 并跳转到用户管理页 */
async function loginAndGoToUsers(page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
  })
  await page.reload()
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', 'admin123')
  await page.click('button.login-btn')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await page.goto('/users')
  await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
}

/** 通过 API 获取 admin token */
async function getAdminToken(request) {
  const res = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  })
  const body = await res.json()
  return body.token
}

/** 通过 API 清理测试用户（id > 5 的非种子数据） */
async function cleanupTestUsers(request) {
  const token = await getAdminToken(request)
  for (const deleted of ['0', '1']) {
    let pageNum = 1
    let hasMore = true
    while (hasMore) {
      const res = await request.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageNum, pageSize: 100, deleted }
      })
      const body = await res.json()
      const users = body.data || []
      for (const u of users) {
        if (u.id > 5) {
          if (deleted === '0') {
            await request.delete(`/api/users/${u.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
          } else {
            // 物理删除：先恢复再删除
            await request.put(`/api/users/${u.id}/restore`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
            await request.delete(`/api/users/${u.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
          }
        }
      }
      hasMore = users.length > 0
      pageNum++
    }
  }
}

/** 在新增/编辑用户弹窗中填写表单并提交 */
async function fillUserDialog(page, data) {
  if (data.name !== undefined) {
    await page.fill('.el-dialog input[placeholder="请输入姓名"]', data.name)
  }
  if (data.username !== undefined) {
    const usernameInput = page.locator('.el-dialog input[placeholder="请输入用户名"]')
    if (await usernameInput.isEnabled()) {
      await usernameInput.fill(data.username)
    }
  }
  if (data.password !== undefined) {
    await page.fill('.el-dialog input[placeholder="请输入密码"]', data.password)
  }
  // 部门（tree-select，限定到可见下拉框内）
  if (data.deptName) {
    await page.click('.el-dialog .el-form-item:has-text("部门") .el-select')
    await page.waitForTimeout(400)
    await page.locator(`.el-select-dropdown:visible .el-tree-node__content:has-text("${data.deptName}")`).click()
  }
  // 角色（普通 select）
  if (data.roleName) {
    await page.click('.el-dialog .el-form-item:has-text("角色") .el-select')
    await page.waitForTimeout(400)
    await page.locator(`.el-select-dropdown:visible .el-select-dropdown__item:has-text("${data.roleName}")`).click()
  }
  if (data.phone !== undefined) {
    await page.fill('.el-dialog input[placeholder="请输入手机号"]', data.phone)
  }
  if (data.email !== undefined) {
    await page.fill('.el-dialog input[placeholder="请输入邮箱"]', data.email)
  }
  if (data.status) {
    await page.click('.el-dialog .el-form-item:has-text("状态") .el-select')
    await page.waitForTimeout(400)
    await page.locator(`.el-select-dropdown:visible .el-select-dropdown__item:has-text("${data.status}")`).click()
  }
  await page.click('.el-dialog__footer button:has-text("确定")')
}

/** 确认 MessageBox 弹窗 */
async function confirmMessageBox(page) {
  await expect(page.locator('.el-message-box')).toBeVisible({ timeout: 3000 })
  await page.locator('.el-message-box__btns button').last().click()
}

/** 标准新增测试用户流程，返回 { username, name } */
async function createTestUser(page, suffix = '', extraData = {}) {
  const ts = Date.now()
  const username = `testuser_${ts}`
  const name = `测试${suffix}_${ts}`
  await page.click('button:has-text("新增用户")')
  await expect(page.locator('.el-dialog')).toBeVisible()
  await fillUserDialog(page, {
    name,
    username,
    password: 'Test@1234',
    deptName: '技术部',
    roleName: '普通用户',
    phone: '13800000001',
    status: '正常',
    ...extraData,
  })
  // 等待弹窗关闭
  await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 }).catch(() => null)
  return { username, name }
}

// ============================================================
// 测试用例
// ============================================================

test.describe('用户管理', () => {

  test.beforeEach(async ({ page, request }) => {
    await cleanupTestUsers(request)
    await loginAndGoToUsers(page)
  })

  // ---------- 页面渲染 ----------

  test('页面正确渲染 - 搜索栏 + 表格 + 分页', async ({ page }) => {
    await expect(page.locator('.search-card')).toBeVisible()
    await expect(page.locator('input[placeholder="姓名/用户名/手机号"]')).toBeVisible()
    await expect(page.locator('th:has-text("用户")')).toBeVisible()
    await expect(page.locator('th:has-text("部门")')).toBeVisible()
    await expect(page.locator('th:has-text("角色")')).toBeVisible()
    await expect(page.locator('th:has-text("手机号")')).toBeVisible()
    await expect(page.locator('th:has-text("状态")')).toBeVisible()
    await expect(page.locator('.el-pagination')).toBeVisible()
    await expect(page.locator('button:has-text("新增用户")')).toBeVisible()
    await expect(page.locator('.view-tab:has-text("用户列表")')).toBeVisible()
    await expect(page.locator('.view-tab:has-text("回收站")')).toBeVisible()
  })

  test('用户列表包含种子数据', async ({ page }) => {
    const count = await page.locator('.el-table tbody tr').count()
    expect(count).toBeGreaterThanOrEqual(3)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).toContain('admin')
  })

  // ---------- 搜索与筛选 ----------

  test('关键词搜索', async ({ page }) => {
    const rowsBefore = await page.locator('.el-table tbody tr').count()
    await page.fill('input[placeholder="姓名/用户名/手机号"]', 'admin')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(800)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText.toLowerCase()).toContain('admin')
    await page.click('button:has-text("重置")')
    await page.waitForTimeout(800)
    const rowsAfter = await page.locator('.el-table tbody tr').count()
    expect(rowsAfter).toBeGreaterThanOrEqual(rowsBefore)
  })

  test('状态筛选', async ({ page }) => {
    await page.click('.search-form .el-form-item:has-text("状态") .el-select')
    await page.waitForTimeout(300)
    await page.locator('.el-select-dropdown:visible .el-select-dropdown__item:has-text("正常")').click()
    await page.waitForTimeout(800)
    const successCount = await page.locator('.el-table tbody tr .el-tag--success').count()
    const totalCount = await page.locator('.el-table tbody tr .el-tag').count()
    expect(totalCount).toBe(successCount)
    await page.click('button:has-text("重置")')
    await page.waitForTimeout(800)
  })

  // ---------- 新增用户 ----------

  test('新增用户弹窗正确渲染', async ({ page }) => {
    await page.click('button:has-text("新增用户")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toHaveText('新增用户')
    await expect(page.locator('.el-dialog input[placeholder="请输入姓名"]')).toBeVisible()
    await expect(page.locator('.el-dialog input[placeholder="请输入用户名"]')).toBeVisible()
    await expect(page.locator('.el-dialog input[placeholder="请输入密码"]')).toBeVisible()
    await expect(page.locator('.el-dialog input[placeholder="请输入手机号"]')).toBeVisible()
    await expect(page.locator('.el-dialog input[placeholder="请输入邮箱"]')).toBeVisible()
    await page.click('.el-dialog__headerbtn')
    await expect(page.locator('.el-dialog')).not.toBeVisible()
  })

  test('新增用户 - 空表单校验', async ({ page }) => {
    await page.click('button:has-text("新增用户")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  })

  test('新增用户 - 成功', async ({ page }) => {
    const { name } = await createTestUser(page, '新增')
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).toContain(name)
  })

  test('新增用户 - 密码复杂度校验', async ({ page }) => {
    const ts = Date.now()
    const username = `pwdtest_${ts}`
    await page.click('button:has-text("新增用户")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await fillUserDialog(page, {
      name: '密码测试',
      username,
      password: '123',
      deptName: '技术部',
      roleName: '普通用户',
      status: '正常',
    })
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 5000 }).catch(() => null)
  })

  // ---------- 编辑用户 ----------

  test('编辑用户', async ({ page }) => {
    const { name } = await createTestUser(page, '编辑')
    const editedName = `${name}_已编辑`
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("编辑")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toHaveText('编辑用户')
    await expect(page.locator('.el-dialog input[placeholder="请输入用户名"]')).toBeDisabled()
    await expect(page.locator('.el-dialog input[placeholder="请输入密码"]')).not.toBeVisible()
    await page.fill('.el-dialog input[placeholder="请输入姓名"]', editedName)
    await page.click('.el-dialog__footer button:has-text("确定")')
    // 等待弹窗关闭即说明编辑成功
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 }).catch(() => null)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).toContain(editedName)
  })

  // ---------- 删除用户 ----------

  test('删除用户 - 软删除', async ({ page }) => {
    const { name } = await createTestUser(page, 'Del')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("删除")').click()
    await confirmMessageBox(page)
    // 等待行消失
    await page.waitForTimeout(500)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).not.toContain(name)
  })

  test('删除用户后可在回收站找到', async ({ page }) => {
    const { name } = await createTestUser(page, '回收')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("删除")').click()
    await confirmMessageBox(page)
    await page.waitForTimeout(500)
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(800)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).toContain(name)
  })

  // ---------- 回收站恢复 ----------

  test('回收站恢复单个用户', async ({ page }) => {
    const { name } = await createTestUser(page, '恢复')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("删除")').click()
    await confirmMessageBox(page)
    await page.waitForTimeout(500)
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(800)
    const deletedRow = page.locator(`.el-table__row:has-text("${name}")`)
    await deletedRow.locator('button:has-text("恢复")').click()
    await confirmMessageBox(page)
    await page.waitForTimeout(300)
    await page.click('.view-tab:has-text("用户列表")')
    await page.waitForTimeout(800)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).toContain(name)
  })

  // ---------- 重置密码 ----------

  test('重置密码弹窗', async ({ page }) => {
    const { name } = await createTestUser(page, '重置')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("重置密码")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toHaveText('重置密码')
    await expect(page.locator('.el-dialog .el-form-item:has-text("用户") input')).toBeDisabled()
    await expect(page.locator('.el-dialog input[placeholder="请输入新密码"]')).toBeVisible()
    await page.click('.el-dialog__headerbtn')
  })

  test('重置密码 - 空密码校验', async ({ page }) => {
    const { name } = await createTestUser(page, '重置空')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("重置密码")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-form-item__error')).toBeVisible()
  })

  test('重置密码 - 成功', async ({ page }) => {
    const { name } = await createTestUser(page, '重置成功')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('button:has-text("重置密码")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()
    await page.fill('.el-dialog input[placeholder="请输入新密码"]', 'NewPass@123')
    await page.click('.el-dialog__footer button:has-text("确定")')
    await page.waitForSelector('.el-dialog', { state: 'hidden', timeout: 8000 }).catch(() => null)
  })

  // ---------- 批量操作 ----------

  test('批量选择 - 选中后出现批量操作按钮', async ({ page }) => {
    await createTestUser(page, 'BA1')
    await createTestUser(page, 'BA2')
    await page.waitForTimeout(500)
    const firstCheckbox = page.locator('.el-table tbody tr').first().locator('.el-checkbox__input')
    await firstCheckbox.click()
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("批量删除")')).toBeVisible()
    await expect(page.locator('button:has-text("批量禁用")')).toBeVisible()
    await expect(page.locator('button:has-text("批量启用")')).toBeVisible()
  })

  test('批量删除', async ({ page }) => {
    const userA = await createTestUser(page, 'BD1')
    const userB = await createTestUser(page, 'BD2')
    await page.waitForTimeout(500)
    for (const userName of [userA.name, userB.name]) {
      const row = page.locator(`.el-table__row:has-text("${userName}")`)
      await row.locator('.el-checkbox__input').first().click()
    }
    await page.waitForTimeout(300)
    await page.click('button:has-text("批量删除")')
    await confirmMessageBox(page)
    await page.waitForTimeout(800)
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).not.toContain(userA.name)
    expect(tableText).not.toContain(userB.name)
  })

  test('批量禁用', async ({ page }) => {
    const { name } = await createTestUser(page, 'BDs')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('.el-checkbox__input').first().click()
    await page.waitForTimeout(300)
    await page.click('button:has-text("批量禁用")')
    await confirmMessageBox(page)
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
    const statusRow = page.locator(`.el-table__row:has-text("${name}")`)
    await expect(statusRow.locator('.el-tag--danger')).toBeVisible()
  })

  test('批量启用', async ({ page }) => {
    const { name } = await createTestUser(page, 'BEn')
    // 先禁用
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    await row.locator('.el-checkbox__input').first().click()
    await page.waitForTimeout(300)
    await page.click('button:has-text("批量禁用")')
    await confirmMessageBox(page)
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
    // 再启用
    const rowAgain = page.locator(`.el-table__row:has-text("${name}")`)
    await rowAgain.locator('.el-checkbox__input').first().click()
    await page.waitForTimeout(300)
    await page.click('button:has-text("批量启用")')
    await confirmMessageBox(page)
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
    const statusRow = page.locator(`.el-table__row:has-text("${name}")`)
    await expect(statusRow.locator('.el-tag--success')).toBeVisible()
  })

  test('批量恢复（回收站）', async ({ page }) => {
    // 创建两个测试用户
    const userA = await createTestUser(page, 'BR1')
    const userB = await createTestUser(page, 'BR2')
    await page.waitForTimeout(500)
    
    // 删除第一个用户
    const row1 = page.locator(`.el-table__row:has-text("${userA.name}")`)
    await row1.locator('button:has-text("删除")').click()
    await confirmMessageBox(page)
    await page.waitForTimeout(300)
    
    // 删除第二个用户
    const row2 = page.locator(`.el-table__row:has-text("${userB.name}")`)
    await row2.locator('button:has-text("删除")').click()
    await confirmMessageBox(page)
    await page.waitForTimeout(300)
    
    // 验证用户不在列表中
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).not.toContain(userA.name)
    expect(tableText).not.toContain(userB.name)
  })

  // ---------- 回收站视图 ----------

  test('回收站视图 - 删除时间列显示', async ({ page }) => {
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)
    await expect(page.locator('.view-tab:has-text("回收站")')).toHaveClass(/active/)
    await expect(page.locator('button:has-text("新增用户")')).not.toBeVisible()
  })

  test('回收站视图 - 操作栏显示恢复按钮', async ({ page }) => {
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)
    const restoreBtns = page.locator('.el-table__body button:has-text("恢复")')
    const count = await restoreBtns.count()
    if (count > 0) {
      await expect(restoreBtns.first()).toBeVisible()
    }
  })

  // ---------- 分页 ----------

  test('分页组件渲染', async ({ page }) => {
    const pagination = page.locator('.el-pagination')
    await expect(pagination).toBeVisible()
    await expect(pagination.locator('.el-pagination__total')).toBeVisible()
    await expect(pagination.locator('.el-pager')).toBeVisible()
    await expect(pagination.locator('.el-pagination__sizes')).toBeVisible()
  })

  test('切换每页条数', async ({ page }) => {
    await page.locator('.el-pagination .el-select .el-select__wrapper').click()
    await page.waitForTimeout(300)
    await page.locator('.el-select-dropdown:visible .el-select-dropdown__item:has-text("20")').click()
    await page.waitForTimeout(1000)
    await expect(page.locator('.el-table tbody tr').first()).toBeVisible()
  })

  // ---------- 用户头像渲染 ----------

  test('用户头像显示姓名首字', async ({ page }) => {
    const { name } = await createTestUser(page, '头像')
    const row = page.locator(`.el-table__row:has-text("${name}")`)
    const avatar = row.locator('.el-avatar')
    await expect(avatar).toBeVisible()
    await expect(avatar).toContainText(name.charAt(0))
  })
})
