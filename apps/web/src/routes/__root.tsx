import { createRootRoute, Outlet } from '@tanstack/react-router'
import { OfflineNotice } from '../components/install-app'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <OfflineNotice />
    </>
  ),
})
