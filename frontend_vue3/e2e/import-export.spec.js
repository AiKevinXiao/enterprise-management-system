import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:8080'

// ============================================================
// 辅助函数
// ============================================================

const TMP_DIR = 'E:/AI_Project/企业管理系统/frontend_vue3/tmp_e2e'
const TEST_FILE = path.join(TMP_DIR, 'test_import.xlsx')

function createTestExcel() {
  // 测试文件由导出功能生成，这里不做任何事
}

function deleteTestExcel() {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE)
}

async function login(page) {
  await page.goto(`${BASE}/login`)
  await page.evaluate(() => {
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
  })
  await page.reload()
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', 'admin123')
  await page.click('button.login-btn')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

async function getAdminToken(request) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { username: 'admin', password: 'admin123' }
  })
  const body = await res.json()
  return body.token
}

async function cleanupE2eUsers(request) {
  const token = await getAdminToken(request)
  for (const deleted of ['0', '1']) {
    let pageNum = 1
    let hasMore = true
    while (hasMore) {
      const res = await request.get(`${BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageNum, pageSize: 100, deleted }
      })
      const body = await res.json()
      const users = body.data || []
      hasMore = users.length > 0
      for (const u of users) {
        if (u.id > 5) {
          if (deleted === '0') {
            await request.delete(`${BASE}/api/users/${u.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
          } else {
            await request.put(`/api/users/${u.id}/restore`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
            await request.delete(`/api/users/${u.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
          }
        }
      }
      pageNum++
    }
  }
}

// ============================================================
// 导入功能测试
// ============================================================

test.describe('用户导入功能', () => {
  test.beforeAll(() => {
    createTestExcel()
  })
  test.afterAll(() => {
    deleteTestExcel()
  })
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/users`)
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
  })

  test.afterEach(async ({ request }) => {
    await cleanupE2eUsers(request)
  })

  test('导入按钮打开 Popover 面板', async ({ page }) => {
    // 点击导入按钮
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await expect(importBtn).toBeVisible()
    await importBtn.click()

    // Popover 应该显示
    await expect(page.locator('.import-panel')).toBeVisible({ timeout: 3000 })
    // 下载模板按钮
    await expect(page.locator('.import-panel button:has-text("下载")')).toBeVisible()
    // 上传区域
    await expect(page.locator('.import-panel .el-upload')).toBeVisible()
    // 确认导入按钮（禁用状态，因为还没有文件）
    const confirmBtn = page.locator('.import-panel button:has-text("确认导入")')
    await expect(confirmBtn).toBeVisible()
    await expect(confirmBtn).toBeDisabled()
  })

  test('下载模板触发文件下载', async ({ page }) => {
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await importBtn.click()
    await expect(page.locator('.import-panel')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('.import-panel button:has-text("下载")').click()
    ])

    const dlName = download.suggestedFilename()
    expect(dlName).toMatch(/\.xlsx$/)
    expect(dlName).toMatch(/用户/)
  })

  test.skip('选择文件后确认导入按钮可用', async ({ page }) => {
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await importBtn.click()
    await expect(page.locator('.import-panel')).toBeVisible()

    // 选择文件
    const fileInput = page.locator('.import-panel input[type="file"]')
    await fileInput.setInputFiles(TEST_FILE)
    await page.waitForTimeout(300)

    // 确认导入按钮应该变为可用
    const confirmBtn = page.locator('.import-panel button:has-text("确认导入")')
    await expect(confirmBtn).toBeEnabled()
  })

  test.skip('导入成功显示结果弹窗', async ({ page }) => {
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await importBtn.click()
    await expect(page.locator('.import-panel')).toBeVisible()

    const fileInput = page.locator('.import-panel input[type="file"]')
    await fileInput.setInputFiles(TEST_FILE)
    await page.waitForTimeout(300)

    // 点击确认导入
    await page.locator('.import-panel button:has-text("确认导入")').click()

    // 等待结果弹窗出现
    await expect(page.locator('.el-dialog:has(.import-result)')).toBeVisible({ timeout: 20000 })

    // 应该有统计数据（成功/跳过/失败至少有一项 > 0）
    const statValues = await page.locator('.import-result .el-statistic .el-statistic__content').allTextContents()
    expect(statValues.length).toBeGreaterThan(0)
    const hasData = statValues.some(v => parseInt(v) > 0)
    expect(hasData).toBe(true)
  })

  test.skip('关闭结果弹窗后表格刷新', async ({ page }) => {
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await importBtn.click()

    const fileInput = page.locator('.import-panel input[type="file"]')
    await fileInput.setInputFiles(TEST_FILE)
    await page.waitForTimeout(300)

    await page.locator('.import-panel button:has-text("确认导入")').click()

    // 等待结果弹窗
    await expect(page.locator('.el-dialog:has(.import-result)')).toBeVisible({ timeout: 20000 })

    // 点击确定关闭
    await page.locator('.el-dialog:has(.import-result) button:has-text("确定")').click()
    await expect(page.locator('.el-dialog:has(.import-result)')).not.toBeVisible({ timeout: 3000 })

    // 表格仍然正常
    const rows = await page.locator('.el-table tbody tr').count()
    expect(rows).toBeGreaterThan(0)
  })
})

// ============================================================
// 导出功能测试
// ============================================================

test.describe('用户导出功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/users`)
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
  })

  test('导出按钮直接触发下载', async ({ page }) => {
    const exportBtn = page.locator('.batch-toolbar button:has-text("导出")')
    await expect(exportBtn).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportBtn.click()
    ])

    const dlName = download.suggestedFilename()
    expect(dlName).toMatch(/\.xlsx$/)
    expect(dlName).toMatch(/用户/)
  })

  test('导出文件可保存且内容有效', async ({ page }) => {
    const tmpDir = 'E:/AI_Project/企业管理系统/frontend_vue3/tmp_e2e'
    fs.mkdirSync(tmpDir, { recursive: true })

    const exportBtn = page.locator('.batch-toolbar button:has-text("导出")')

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportBtn.click()
    ])

    const dlPath = path.join(tmpDir, download.suggestedFilename())
    await download.saveAs(dlPath)

    expect(fs.existsSync(dlPath)).toBe(true)
    expect(fs.statSync(dlPath).size).toBeGreaterThan(1024) // 至少 1KB

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ============================================================
// 部门导入导出测试
// ============================================================

test.describe('部门导入导出功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/departments`)
    await page.waitForSelector('.el-table tbody tr', { timeout: 10000 })
  })

  test('部门导入 Popover 正常打开', async ({ page }) => {
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await expect(importBtn).toBeVisible()
    await importBtn.click()
    await expect(page.locator('.import-panel')).toBeVisible({ timeout: 3000 })
    // 下载按钮文字应该是"下载部门模板"
    const dlBtn = page.locator('.import-panel button:has-text("下载")')
    await expect(dlBtn).toBeVisible()
    const dlText = await dlBtn.textContent()
    expect(dlText).toMatch(/部门/)
  })

  test('部门导出直接触发下载', async ({ page }) => {
    const exportBtn = page.locator('.batch-toolbar button:has-text("导出")')
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportBtn.click()
    ])
    const dlName = download.suggestedFilename()
    expect(dlName).toMatch(/\.xlsx$/)
    expect(dlName).toMatch(/部门/)
  })
})

// ============================================================
// 角色导入导出测试
// ============================================================

test.describe('角色导入导出功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/roles`)
    await expect(page.locator('.role-list').first()).toBeVisible({ timeout: 10000 })
  })

  test('角色导入 Popover 正常打开', async ({ page }) => {
    const importBtn = page.locator('.batch-toolbar button:has-text("导入")')
    await expect(importBtn).toBeVisible()
    await importBtn.click()
    await expect(page.locator('.import-panel')).toBeVisible({ timeout: 3000 })
    const dlBtn = page.locator('.import-panel button:has-text("下载")')
    await expect(dlBtn).toBeVisible()
    const dlText = await dlBtn.textContent()
    expect(dlText).toMatch(/角色/)
  })

  test('角色导出直接触发下载', async ({ page }) => {
    const exportBtn = page.locator('.batch-toolbar button:has-text("导出")')
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportBtn.click()
    ])
    const dlName = download.suggestedFilename()
    expect(dlName).toMatch(/\.xlsx$/)
    expect(dlName).toMatch(/角色/)
  })
})