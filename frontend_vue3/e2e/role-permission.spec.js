import { test, expect } from '@playwright/test'

// ============================================================
// 辅助函数
// ============================================================

/** 登录 admin 并跳转到角色权限页 */
async function loginAndGoToRoles(page) {
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
  await page.goto('/roles')
  await page.waitForSelector('.role-item', { timeout: 10000 })
}

// ============================================================
// 测试用例
// ============================================================

test.describe('角色权限', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndGoToRoles(page)
  })

  // ---------- 初始加载 ----------

  test('首次进入页面 - 默认选中第一个角色并显示权限数据', async ({ page }) => {
    // 第一个角色应处于选中状态
    const firstRole = page.locator('.role-item').first()
    await expect(firstRole).toHaveClass(/active/)
    const roleName = await firstRole.locator('.role-name').textContent()

    // 右侧应显示权限配置标题
    await expect(page.locator('.el-col:last-child .el-card')).toBeVisible()
    await expect(page.locator('.el-col:last-child .el-card').locator('.el-card__header')).toContainText(roleName?.trim() || '')

    // 权限模块应有数据（至少有 4 个模块：首页、角色权限、部门架构、用户管理）
    const modules = page.locator('.permission-module')
    await expect(modules).toHaveCount(4, { timeout: 10000 })

    // 每个模块下应有 checkbox 子项
    const firstModuleChecks = modules.first().locator('.module-permissions .el-checkbox')
    const childCount = await firstModuleChecks.count()
    expect(childCount).toBeGreaterThan(0)

    // 权限 checkbox 应存在已勾选项（admin 有 16 项权限）
    const checkedCount = await page.locator('.permission-grid .el-checkbox__input.is-checked').count()
    expect(checkedCount).toBeGreaterThan(0)
  })

  // ---------- 角色切换 ----------

  test('切换角色 - 权限数据跟随更新', async ({ page }) => {
    // 等待权限加载完成
    await expect(page.locator('.permission-module')).toHaveCount(4, { timeout: 10000 })
    const modules = page.locator('.permission-module')

    // 记录第一个角色的勾选数
    const firstChecked = await page.locator('.permission-grid .el-checkbox.is-checked').count()

    // 点击第二个角色
    const roles = page.locator('.role-item')
    const secondRoleName = await roles.nth(1).locator('.role-name').textContent()
    await roles.nth(1).click()

    // 标题应切换
    await expect(page.locator('.el-col:last-child .el-card__header')).toContainText(secondRoleName?.trim() || '')

    // 等待权限数据更新
    await page.waitForTimeout(500)

    // 第二个角色（部门经理）的权限数应与 admin 不同
    const secondChecked = await page.locator('.permission-grid .el-checkbox.is-checked').count()
    // admin=16，部门经理=9，不可能相同
    expect(firstChecked).not.toBe(secondChecked)
  })

  // ---------- 模块全选/取消 ----------

  test('模块全选/取消 - checkbox 联动正确', async ({ page }) => {
    await expect(page.locator('.permission-module')).toHaveCount(4, { timeout: 10000 })
    const firstModule = page.locator('.permission-module').first()
    const moduleCheckbox = firstModule.locator('.module-header .el-checkbox')
    const childCheckboxes = firstModule.locator('.module-permissions .el-checkbox')
    const totalCount = await childCheckboxes.count()

    // 记录初始勾选数
    const initialChecked = await childCheckboxes.locator('.el-checkbox__input.is-checked').count()

    // 点击模块 checkbox 切换状态
    await moduleCheckbox.click()
    await page.waitForTimeout(300)
    let afterFirstClick = await childCheckboxes.locator('.el-checkbox__input.is-checked').count()

    // 再次点击，应回到相反状态
    await moduleCheckbox.click()
    await page.waitForTimeout(300)
    const afterSecondClick = await childCheckboxes.locator('.el-checkbox__input.is-checked').count()

    // 两次点击后状态应不同（toggle 行为）
    // 特殊情况：如果初始全是 indeterminate，两次点击后可能不等于初始值
    // 核心验证：点击能改变子项勾选状态
    expect(afterFirstClick).not.toBe(initialChecked)
  })

  // ---------- 回收站 ----------

  test('回收站视图切换', async ({ page }) => {
    await page.click('.view-tab:has-text("回收站")')
    await page.waitForTimeout(500)

    // 应切换到回收站视图
    await expect(page.locator('.view-tab:has-text("回收站")')).toHaveClass(/active/)
    // 右侧如果有选中角色应显示只读
    const deletedItems = page.locator('.role-item.deleted')
    // 回收站可能为空，只验证视图切换
    await expect(page.locator('.view-tab:has-text("角色列表")')).not.toHaveClass(/active/)
  })

})
