import { SidebarStatus } from '~/scenes/ui/components/SlideOutSidebar/constants'

class ActionHistoryStore {
  status: SidebarStatus

  get isActive() {
    return this.status === SidebarStatus.Revealed
  }
}

export const actionHistoryStore = new ActionHistoryStore()
