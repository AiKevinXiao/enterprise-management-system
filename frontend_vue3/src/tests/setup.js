// Vitest 测试环境配置
// 由于 request.js 依赖 router 和 localStorage，这里 mock 掉

// Mock router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  currentRoute: { value: { path: '/login' } }
}

// Mock localStorage
const localStorageMock = {
  data: {},
  getItem(key) { return this.data[key] || null },
  setItem(key, value) { this.data[key] = value },
  removeItem(key) { delete this.data[key] },
  clear() { this.data = {} }
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock import.meta.url for @ alias
Object.defineProperty(import.meta, 'url', {
  value: 'file://' + process.cwd().replace(/\\/g, '/') + '/src/tests/setup.js'
})