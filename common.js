/* 企业管理系统 - 公共脚本 */

/**
 * 路由状态管理
 * 保存/恢复当前选中的导航项到 localStorage
 */
const RouteState = {
  STORAGE_KEY: 'ems_active_nav',
  
  // 保存当前页面标识
  save(pageId) {
    localStorage.setItem(this.STORAGE_KEY, pageId);
  },
  
  // 读取保存的页面标识
  load() {
    return localStorage.getItem(this.STORAGE_KEY);
  },
  
  // 清除保存的状态
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },
  
  // 初始化导航高亮
  initNav() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
    
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href) {
        const pageName = href.replace('.html', '');
        if (pageName === currentPage) {
          item.classList.add('active');
        }
      } else if (currentPage === 'dashboard' && item.textContent.includes('首页概览')) {
        // dashboard 页面特殊处理 - 匹配没有 href 的首页概览菜单项
        item.classList.add('active');
      }
    });
    
    // 保存当前页面状态
    this.save(currentPage);
  }
};

/**
 * 弹窗管理
 */
const ModalManager = {
  open(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  
  close(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  
  // 初始化弹窗事件（点击遮罩关闭）
  init() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
    
    // ESC 键关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
          modal.classList.remove('active');
        });
        document.body.style.overflow = '';
      }
    });
  }
};

/**
 * 表格批量操作
 */
const TableBatch = {
  init() {
    const selectAll = document.getElementById('selectAll');
    const batchBar = document.getElementById('batchBar');
    
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        document.querySelectorAll('.user-checkbox').forEach(cb => {
          cb.checked = selectAll.checked;
        });
        this.updateBatchBar();
      });
    }
    
    document.querySelectorAll('.user-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.updateBatchBar());
    });
  },
  
  updateBatchBar() {
    const checked = document.querySelectorAll('.user-checkbox:checked').length;
    const batchBar = document.getElementById('batchBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (batchBar && selectedCount) {
      selectedCount.textContent = checked;
      batchBar.style.display = checked > 0 ? 'flex' : 'none';
    }
    
    // 同步全选框状态
    const selectAll = document.getElementById('selectAll');
    const allCheckboxes = document.querySelectorAll('.user-checkbox');
    if (selectAll && allCheckboxes.length > 0) {
      selectAll.checked = checked === allCheckboxes.length && checked > 0;
      selectAll.indeterminate = checked > 0 && checked < allCheckboxes.length;
    }
  },
  
  // 获取选中的行数据
  getSelected() {
    return Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => {
      const row = cb.closest('tr');
      return {
        name: row?.querySelector('.user-name-cell')?.textContent || '',
        account: row?.querySelector('.user-account')?.textContent || ''
      };
    });
  }
};

/**
 * 确认对话框
 */
function confirmAction(action, callback) {
  const message = `确定要${action}吗？此操作不可恢复。`;
  if (confirm(message)) {
    if (typeof callback === 'function') {
      callback();
    } else {
      showToast(`${action}成功`);
    }
  }
}

/**
 * Toast 提示
 */
function showToast(message, type = 'success') {
  // 移除已有的 toast
  const existing = document.querySelector('.ems-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'ems-toast';
  toast.style.cssText = `
    position:fixed;top:80px;left:50%;transform:translateX(-50%);
    padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;
    animation:slideDown 0.3s ease;
    ${type === 'success' ? 'background:rgba(22,163,74,.9);color:#fff;' : ''}
    ${type === 'error' ? 'background:rgba(239,68,68,.9);color:#fff;' : ''}
    ${type === 'warning' ? 'background:rgba(245,158,11,.9);color:#fff;' : ''}
  `;
  toast.textContent = message;
  
  // 添加动画样式
  if (!document.getElementById('ems-toast-style')) {
    const style = document.createElement('style');
    style.id = 'ems-toast-style';
    style.textContent = `
      @keyframes slideDown {
        from { opacity:0; transform:translateX(-50%) translateY(-20px); }
        to { opacity:1; transform:translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * 主题管理
 */
const ThemeManager = {
  STORAGE_KEY: 'ems_theme',
  
  // 获取当前主题
  getTheme() {
    return localStorage.getItem(this.STORAGE_KEY) || 'dark';
  },
  
  // 设置主题
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateThemeIcon(theme);
  },
  
  // 切换主题
  toggle() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    showToast(`已切换到${next === 'dark' ? '深色' : '浅色'}模式`);
  },
  
  // 初始化主题
  init() {
    const theme = this.getTheme();
    this.setTheme(theme);
  },
  
  // 更新主题图标
  updateThemeIcon(theme) {
    const icon = document.getElementById('themeToggleIcon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
};

/**
 * 用户认证管理
 */
const AuthManager = {
  // 检查是否已登录
  isLoggedIn() {
    return localStorage.getItem('ems_logged_in') === 'true';
  },
  
  // 设置登录状态
  setLoggedIn(username) {
    localStorage.setItem('ems_logged_in', 'true');
    localStorage.setItem('ems_username', username);
  },
  
  // 退出登录
  logout() {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('ems_logged_in');
      localStorage.removeItem('ems_username');
      window.location.href = 'login.html';
    }
  },
  
  // 获取当前用户名
  getUsername() {
    return localStorage.getItem('ems_username') || '用户';
  },
  
  // 检查登录状态（在需要登录的页面调用）
  checkAuth() {
    if (!this.isLoggedIn() && !window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }
};

/**
 * 搜索防抖
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 初始化所有功能
 */
document.addEventListener('DOMContentLoaded', () => {
  // 初始化主题
  ThemeManager.init();
  
  // 检查登录状态（登录页除外）
  if (!window.location.pathname.includes('login.html')) {
    AuthManager.checkAuth();
  }
  
  // 更新用户名显示
  const usernameEl = document.getElementById('currentUsername');
  if (usernameEl) {
    usernameEl.textContent = AuthManager.getUsername();
  }
  
  // 初始化路由状态
  RouteState.initNav();
  
  // 初始化弹窗
  ModalManager.init();
  
  // 初始化表格批量操作
  TableBatch.init();
  
  // 搜索框防抖
  const searchBox = document.querySelector('.search-box');
  if (searchBox) {
    searchBox.addEventListener('input', debounce((e) => {
      console.log('搜索:', e.target.value);
      // 这里可以接实际的搜索逻辑
    }, 300));
  }
});

// 导出全局函数（供内联 onclick 使用）
window.openModal = (type) => {
  if (type === 'add' || type === 'edit') {
    const title = document.getElementById('modalTitle');
    if (title) title.textContent = type === 'add' ? '新增用户' : '编辑用户';
    ModalManager.open('userModal');
  } else if (type === 'reset') {
    ModalManager.open('resetModal');
  }
};

window.closeModal = (id) => ModalManager.close(id);
window.confirmAction = confirmAction;
window.showToast = showToast;
window.toggleTheme = () => ThemeManager.toggle();
window.logout = () => AuthManager.logout();
