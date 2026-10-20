import { createPermissionGuard } from './createPermissionGuard'

export function setupRouterGuard(router) {
  createPermissionGuard(router)
}
