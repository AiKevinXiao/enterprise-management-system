import { test, expect } from '@playwright/test'

// 辅助函数：登录
async function login(page, username = 'admin', password = 'admin123') {
  await page.goto('/login')
  await page.fill('input[placeholder="用户名"]', username)
  await page.fill('input[placeholder="密码"]', password)
  await page.click('button.login-btn')
  await page.waitForURL('**/dashboard', { timeout: 5000 })
}

// 辅助函数：生成唯一编码
function uniqueCode(prefix = 'DEPT') {
  return `${prefix}-${Date.now()}`
}

test.describe('部门管理', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/departments')
    await page.waitForTimeout(500)
  })

  test('页面正确渲染', async ({ page }) => {
    // 验证页面标题和标签页
    await expect(page.locator('.view-tab:has-text("部门列表")')).toBeVisible()
    await expect(page.locator('.view-tab:has-text("回收站")')).toBeVisible()
    // 验证新增按钮
    await expect(page.locator('button:has-text("新增部门")')).toBeVisible()
    // 验证表格列
    await expect(page.locator('th:has-text("部门名称")')).toBeVisible()
    await expect(page.locator('th:has-text("部门编码")')).toBeVisible()
    await expect(page.locator('th:has-text("状态")')).toBeVisible()
  })

  test('部门列表包含种子数据', async ({ page }) => {
    // 等待表格加载完成
    await page.waitForSelector('.el-table tbody tr', { timeout: 5000 })
    const rows = await page.locator('.el-table tbody tr').count()
    expect(rows).toBeGreaterThan(0)
    // 验证至少包含种子部门（技术部、销售部等）
    const tableText = await page.locator('.el-table').textContent()
    expect(tableText).toContain('技术部')
  })

  test('新增部门弹窗正确渲染', async ({ page }) => {
    await page.click('button:has-text("新增部门")')
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toHaveText('新增部门')
    // 验证表单字段
    await expect(page.locator('.el-form-item:has-text("上级部门")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("部门名称")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("部门编码")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("状态")')).toBeVisible()
    // 验证按钮
    await expect(page.locator('.el-dialog__footer button:has-text("取消")')).toBeVisible()
    await expect(page.locator('.el-dialog__footer button:has-text("确定")')).toBeVisible()
  })

  test('新增部门-成功', async ({ page }) => {
    const deptName = `测试部门-${Date.now()}`
    const deptCode = uniqueCode()

    await page.click('button:has-text("新增部门")')
    await page.waitForSelector('.el-dialog', { state: 'visible' })

    // 填写表单（必填：部门名称）
    await page.fill('input[placeholder="请输入部门名称"]', deptName)
    await page.fill('input[placeholder="请输入部门编码"]', deptCode)

    // 提交
    await page.click('.el-dialog__footer button:has-text("确定")')

    // 等待成功消息
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 验证新部门出现在列表中
    await expect(page.locator(`.el-table`)).toContainText(deptName)
  })

  test('新增部门-空表单校验', async ({ page }) => {
    await page.click('button:has-text("新增部门")')
    await page.waitForSelector('.el-dialog', { state: 'visible' })

    // 直接点击确定，触发校验
    await page.click('.el-dialog__footer button:has-text("确定")')

    // 验证校验提示
    await expect(page.locator('.el-form-item__error')).toContainText('请输入部门名称')
  })

  test('编辑部门', async ({ page }) => {
    // 先新增一个部门
    const deptName = `待编辑-${Date.now()}`
    const newCode = uniqueCode('EDIT')

    await page.click('button:has-text("新增部门")')
    await page.fill('input[placeholder="请输入部门名称"]', deptName)
    await page.fill('input[placeholder="请输入部门编码"]', newCode)
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 刷新页面重新加载
    await page.reload()
    await page.waitForTimeout(500)

    // 定位到刚创建的部门行，再点击该行的编辑按钮
    const row = page.locator(`.el-table__row:has-text("${deptName}")`)
    await row.locator('button:has-text("编辑")').click()
    await page.waitForSelector('.el-dialog', { state: 'visible' })
    await expect(page.locator('.el-dialog__title')).toHaveText('编辑部门')

    // 修改名称
    const editedName = `${deptName}-已修改`
    await page.fill('input[placeholder="请输入部门名称"]', editedName)

    // 提交
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 验证修改成功
    await expect(page.locator('.el-table')).toContainText(editedName)
  })

  test('删除部门', async ({ page }) => {
    // 先新增一个部门用于删除
    const deptName = `待删除-${Date.now()}`
    const deleteCode = uniqueCode('DEL')

    await page.click('button:has-text("新增部门")')
    await page.fill('input[placeholder="请输入部门名称"]', deptName)
    await page.fill('input[placeholder="请输入部门编码"]', deleteCode)
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 刷新页面
    await page.reload()
    await page.waitForTimeout(500)

    // 定位到刚创建的部门行，再点击该行的删除按钮
    const row = page.locator(`.el-table__row:has-text("${deptName}")`)
    await row.locator('button:has-text("删除")').click()

    // 确认删除弹窗
    await expect(page.locator('.el-message-box')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('.el-message-box__content')).toContainText('确定要删除')

    // 点击确认删除
    await page.click('.el-message-box button:has-text("确定")')

    // 验证成功消息
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 验证部门从列表中消失（软删除，切换到回收站应该能看到）
    await expect(page.locator('.el-table')).not.toContainText(deptName)
  })

  test('回收站视图切换', async ({ page }) => {
    // 点击回收站标签
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)

    // 验证视图切换
    await expect(page.locator('.view-tab:has-text("回收站")')).toHaveClass(/active/)
    // 验证列变化（删除时间列显示）
    await expect(page.locator('th:has-text("删除时间")')).toBeVisible()
    // 注意：回收站为空时不存在恢复按钮，所以不验证按钮存在性
  })

  test('回收站恢复部门', async ({ page }) => {
    // 先新增并删除一个部门
    const deptName = `待恢复-${Date.now()}`
    const restoreCode = uniqueCode('REST')

    await page.click('button:has-text("新增部门")')
    await page.fill('input[placeholder="请输入部门名称"]', deptName)
    await page.fill('input[placeholder="请输入部门编码"]', restoreCode)
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 删除该部门
    await page.reload()
    await page.waitForTimeout(500)
    const rowToDelete = page.locator(`.el-table__row:has-text("${deptName}")`)
    await rowToDelete.locator('button:has-text("删除")').click()
    await page.click('.el-message-box button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 切换到回收站
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)

    // 验证删除的部门在回收站中
    await expect(page.locator('.el-table')).toContainText(deptName)

    // 定位到该行，点击恢复按钮
    const rowToRestore = page.locator(`.el-table__row:has-text("${deptName}")`)
    await rowToRestore.locator('button:has-text("恢复")').click()

    // 验证成功消息
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 验证部门回到列表
    await page.click('.view-tab:has-text("部门列表")')
    await page.waitForTimeout(500)
    await expect(page.locator('.el-table')).toContainText(deptName)
  })

  test('状态切换-禁用', async ({ page }) => {
    // 先新增一个部门
    const deptName = `待禁用-${Date.now()}`
    const disableCode = uniqueCode('DIS')

    await page.click('button:has-text("新增部门")')
    await page.fill('input[placeholder="请输入部门名称"]', deptName)
    await page.fill('input[placeholder="请输入部门编码"]', disableCode)
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 编辑该部门，设为禁用
    await page.reload()
    await page.waitForTimeout(500)
    const row = page.locator(`.el-table__row:has-text("${deptName}")`)
    await row.locator('button:has-text("编辑")').click()

    // 将状态切换为禁用
    // 精确定位状态选择器（排除上级部门选择器）
    await page.click('.el-form-item:has-text("状态") .el-select')
    await page.getByRole('option', { name: '禁用' }).click()
    await page.click('.el-dialog__footer button:has-text("确定")')
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    // 刷新页面确保数据同步
    await page.reload()
    await page.waitForTimeout(500)

    // 验证状态显示为禁用
    await expect(page.locator('.el-table')).toContainText(deptName)
    // 找到该行，验证状态标签
    const statusRow = page.locator(`.el-table__row:has-text("${deptName}")`)
    await expect(statusRow.locator('.el-tag')).toHaveText('禁用')
  })

  test('树形结构展示', async ({ page }) => {
    // 点击新增，验证上级部门是树形选择
    await page.click('button:has-text("新增部门")')
    await page.waitForSelector('.el-dialog', { state: 'visible' })
    await page.waitForTimeout(500) // 等待弹窗完全渲染

    // 点击上级部门选择器（使用 combobox 定位）
    await page.click('.el-dialog .el-form-item:has-text("上级部门") .el-select')
    await page.waitForTimeout(300)

    // 验证树形结构显示（应该有技术部等父部门）
    await expect(page.locator(`.el-tree-node:has-text("技术部")`)).toBeVisible()
  })
})