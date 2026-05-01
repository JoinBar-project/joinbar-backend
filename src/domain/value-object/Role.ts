/** 角色名稱常數 */
export const RoleName = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

/**
 * 權限碼常數，格式：BACKEND:{DOMAIN}:{ACTION}
 */
export const PermissionCode = {
  // 使用者管理
  BACKEND_USER_VIEW: 'BACKEND:USER:VIEW',
  BACKEND_USER_EDIT: 'BACKEND:USER:EDIT',

  // 酒吧管理
  BACKEND_BAR_VIEW: 'BACKEND:BAR:VIEW',
  BACKEND_BAR_EDIT: 'BACKEND:BAR:EDIT',

  // 活動管理
  BACKEND_EVENT_VIEW: 'BACKEND:EVENT:VIEW',
  BACKEND_EVENT_EDIT: 'BACKEND:EVENT:EDIT',

  // 訂單管理
  BACKEND_ORDER_VIEW: 'BACKEND:ORDER:VIEW',
  BACKEND_ORDER_EDIT: 'BACKEND:ORDER:EDIT',

  // 訂閱方案管理
  BACKEND_SUBSCRIPTION_VIEW: 'BACKEND:SUBSCRIPTION:VIEW',
  BACKEND_SUBSCRIPTION_EDIT: 'BACKEND:SUBSCRIPTION:EDIT',

  // 標籤管理
  BACKEND_TAG_VIEW: 'BACKEND:TAG:VIEW',
  BACKEND_TAG_EDIT: 'BACKEND:TAG:EDIT',

  // 角色管理
  BACKEND_ROLE_VIEW: 'BACKEND:ROLE:VIEW',
  BACKEND_ROLE_EDIT: 'BACKEND:ROLE:EDIT',
} as const;

export type PermissionCode =
  (typeof PermissionCode)[keyof typeof PermissionCode];
