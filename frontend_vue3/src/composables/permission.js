import { useUserStore } from '../stores/user'

/**
 * v-permission 权限指令
 * 用法: v-permission="'user-create'" 或 v-permission="['user-create', 'user-edit']"
 * 无权限时隐藏元素
 */
export const permissionDirective = {
  mounted(el, binding) {
    const userStore = useUserStore()
    const value = binding.value
    
    if (!value) return
    
    let hasPermission = false
    if (Array.isArray(value)) {
      hasPermission = userStore.hasAnyPermission(value)
    } else {
      hasPermission = userStore.hasPermission(value)
    }
    
    if (!hasPermission) {
      el.style.display = 'none'
      el.setAttribute('data-no-permission', 'true')
    }
  }
}

/**
 * 权限检查函数
 */
export function checkPermission(value) {
  const userStore = useUserStore()
  
  if (!value) return true
  
  if (Array.isArray(value)) {
    return userStore.hasAnyPermission(value)
  }
  return userStore.hasPermission(value)
}

/**
 * 注册全局指令和属性
 */
export function setupPermission(app) {
  // 注册指令
  app.directive('permission', permissionDirective)
  
  // 全局属性
  app.config.globalProperties.$hasPermission = (code) => {
    const userStore = useUserStore()
    return userStore.hasPermission(code)
  }
}
