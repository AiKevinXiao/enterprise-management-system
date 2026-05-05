import { test, expect } from '@playwright/test'

test.describe('登录流程', () => {

  test.beforeEach(async ({ page }) => {
    // 清除 localStorage，确保干净的登录状态
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.removeItem('ems_token')
      localStorage.removeItem('ems_user')
    })
    await page.reload()
  })

  test('页面正确渲染', async ({ page }) => {
    await expect(page.locator('.login-header h1')).toHaveText('企业管理系统')
    await expect(page.locator('input[placeholder="用户名"]')).toBeVisible()
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible()
    await expect(page.locator('button.login-btn')).toHaveText('登 录')
  })

  test('空表单提交显示校验提示', async ({ page }) => {
    await page.click('button.login-btn')
    const errors = page.locator('.el-form-item__error')
    await expect(errors).toHaveCount(2)
    await expect(errors.first()).toContainText('请输入用户名')
    await expect(errors.nth(1)).toContainText('请输入密码')
  })

  test('只填用户名提交显示密码校验提示', async ({ page }) => {
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.click('button.login-btn')
    await expect(page.locator('.el-form-item__error')).toContainText('请输入密码')
  })

  test('错误用户名/密码登录失败', async ({ page }) => {
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'wrongpassword')
    await page.click('button.login-btn')
    // 等待错误提示出现
    await expect(page.locator('.el-message--error')).toBeVisible({ timeout: 5000 })
  })

  test('admin 登录成功跳转到工作台', async ({ page }) => {
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button.login-btn')
    // 登录成功应跳转到 /dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('登录成功后 localStorage 存储 token', async ({ page }) => {
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button.login-btn')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    const token = await page.evaluate(() => localStorage.getItem('ems_token'))
    expect(token).toBeTruthy()
    // JWT 格式校验
    expect(token.split('.').length).toBe(3)
  })

  test('登录成功后 localStorage 存储用户信息', async ({ page }) => {
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button.login-btn')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    const user = await page.evaluate(() => {
      const raw = localStorage.getItem('ems_user')
      return raw ? JSON.parse(raw) : null
    })
    expect(user).toBeTruthy()
    expect(user.username).toBe('admin')
    expect(user.name).toBe('管理员')
  })

  test('已登录状态访问 /login 重定向到 /dashboard', async ({ page }) => {
    // 先登录
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button.login-btn')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    // 再访问 /login 应重定向
    await page.goto('/login')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('未登录访问 /dashboard 重定向到 /login', async ({ page }) => {
    // 确保 token 已清除
    await page.evaluate(() => {
      localStorage.removeItem('ems_token')
      localStorage.removeItem('ems_user')
    })
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('密码框回车键登录', async ({ page }) => {
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.press('input[placeholder="密码"]', 'Enter')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    expect(page.url()).toContain('/dashboard')
  })
})
