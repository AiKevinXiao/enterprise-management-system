SET FOREIGN_KEY_CHECKS=0;

INSERT INTO departments (id, name, code, parent_id, manager, description, location, quota, created_at) VALUES
('1', '集团公司', 'DEPT-ROOT', NULL, '肖先生', '集团总部', '总部大厦', '200', '2026-05-02 09:45:43'),
('2', '技术部', 'DEPT-TECH', '1', '张三', '负责核心产品技术研发', 'A座8层', '50', '2026-05-02 09:45:43'),
('3', '前端开发组', 'DEPT-FE', '2', '李四', 'Web前端开发', 'A座8层', '15', '2026-05-02 09:45:43'),
('4', '后端开发组', 'DEPT-BE', '2', '王五', '服务端开发', 'A座8层', '20', '2026-05-02 09:45:43'),
('5', '产品部', 'DEPT-PM', '1', '孙八', '产品规划与设计', 'A座7层', '25', '2026-05-02 09:45:43'),
('6', '销售部', 'DEPT-SALES', '1', '郑十一', '销售业务', 'B座3层', '50', '2026-05-02 09:45:43'),
('7', '人力资源部', 'DEPT-HR', '1', '陈十二', '人事管理', 'A座6层', '15', '2026-05-02 09:45:43'),
('8', '财务部', 'DEPT-FIN', '1', '林十三', '财务管理', 'A座6层', '12', '2026-05-02 09:45:43');

INSERT INTO roles (id, name, code, description, type, data_scope, user_count, deleted_at, created_at) VALUES
('1', '超级管理员', 'admin', '拥有系统全部权限', 'system', 'all', '1', NULL, '2026-05-02 09:45:43'),
('2', '部门经理', 'dept_manager', '管理部门成员', 'custom', 'dept', '2', NULL, '2026-05-02 09:45:43'),
('3', '普通员工', 'user', '基础办公权限', 'custom', 'self', '2', NULL, '2026-05-02 09:45:43'),
('4', 'test', 'test', '', 'custom', 'self', '0', '2026-05-02 16:27:50', '2026-05-02 09:51:46'),
('5', 'test2', 'test2', '', 'custom', 'self', '0', '2026-05-02 16:27:52', '2026-05-02 10:12:04');

INSERT INTO permissions (id, module, code, name, description) VALUES
('1', '首页', 'view-dashboard', '查看首页', '查看首页统计和概览信息'),
('2', '用户', 'user-view', '查看用户列表', '查看系统用户列表'),
('3', '用户', 'user-create', '新增用户', '创建新用户'),
('4', '用户', 'user-edit', '编辑用户', '修改用户信息'),
('5', '用户', 'user-delete', '删除用户', '删除系统用户'),
('6', '用户', 'user-reset-pwd', '重置密码', '重置用户密码'),
('7', '用户', 'user-restore', '恢复用户', '查看回收站并恢复已删除用户'),
('8', '部门架构', 'dept-view', '查看部门架构', '查看部门树形结构'),
('9', '部门架构', 'dept-create', '新增部门', '创建新部门'),
('10', '部门架构', 'dept-edit', '编辑部门', '修改部门信息'),
('11', '部门架构', 'dept-delete', '删除部门', '删除部门'),
('12', '角色权限', 'role-view', '查看角色列表', '查看系统角色'),
('13', '角色权限', 'role-create', '新增角色', '创建新角色'),
('14', '角色权限', 'role-edit', '编辑角色', '修改角色和权限配置'),
('15', '角色权限', 'role-delete', '删除角色', '删除系统角色'),
('16', '角色权限', 'role-restore', '恢复角色', '从回收站恢复已删除角色');

INSERT INTO role_permissions (role_id, permission_id) VALUES
('1', '9'),
('1', '11'),
('1', '10'),
('1', '8'),
('1', '13'),
('1', '15'),
('1', '14'),
('1', '16'),
('1', '12'),
('1', '3'),
('1', '5'),
('1', '4'),
('1', '6'),
('1', '7'),
('1', '2'),
('1', '1'),
('2', '1'),
('2', '2'),
('2', '3'),
('2', '4'),
('2', '8'),
('2', '9'),
('2', '10'),
('2', '12'),
('2', '15'),
('2', '16'),
('3', '1'),
('3', '2'),
('3', '8'),
('4', '1'),
('4', '8'),
('5', '1'),
('5', '2');

INSERT INTO users (id, username, password, name, phone, email, dept_id, role_id, status, last_login, deleted_at, created_at, updated_at) VALUES
('1', 'admin', '$2a$10$S75gPkWGWKx.5VcpA6LvMu3FtJKKvibiQGBEeLBAsHDtpN5QgI7re', '管理员', '13800000001', 'admin@ems.com', '1', '1', 'active', '2026-05-02 16:34:40', '2026-05-02 09:45:43', '2026-05-02 09:45:43', NULL),
('2', 'zhangsan', '$2a$10$S75gPkWGWKx.5VcpA6LvMuQj3XNJm6nVsl2IJfLPN4PUNoCaSqC5.', '张三', '13800000002', 'zhangsan@ems.com', '2', '2', 'active', NULL, '2026-05-02 09:45:43', '2026-05-02 09:45:43', NULL),
('3', 'lisi', '$2a$10$S75gPkWGWKx.5VcpA6LvMuQj3XNJm6nVsl2IJfLPN4PUNoCaSqC5.', '李四', '13800000003', 'lisi@ems.com', '3', '3', 'active', NULL, '2026-05-02 09:45:43', '2026-05-02 09:45:43', NULL),
('4', 'wangwu', '$2a$10$S75gPkWGWKx.5VcpA6LvMuQj3XNJm6nVsl2IJfLPN4PUNoCaSqC5.', '王五', '13800000004', 'wangwu@ems.com', '4', '3', 'disabled', NULL, '2026-05-02 09:45:43', '2026-05-02 09:45:43', NULL),
('5', 'zhaoliu', '$2a$10$S75gPkWGWKx.5VcpA6LvMuQj3XNJm6nVsl2IJfLPN4PUNoCaSqC5.', '赵六', '13800000005', 'zhaoliu@ems.com', '7', '3', 'pending', NULL, '2026-05-02 09:45:43', '2026-05-02 16:31:50', NULL);

INSERT INTO login_logs (id, username, ip, success, message, created_at) VALUES
('1', 'admin', '::1', '1', '登录成功', '2026-05-02 09:46:03'),
('2', 'admin', '::1', '1', '登录成功', '2026-05-02 16:32:15'),
('3', 'admin', '::1', '1', '登录成功', '2026-05-02 16:32:29'),
('4', 'admin', '::1', '1', '登录成功', '2026-05-02 16:32:39'),
('5', 'admin', '::1', '1', '登录成功', '2026-05-02 16:34:30'),
('6', 'admin', '::1', '1', '登录成功', '2026-05-02 16:34:40');

SET FOREIGN_KEY_CHECKS=1;
