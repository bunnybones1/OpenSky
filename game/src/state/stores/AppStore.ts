export enum AppStatus {
  Active = 'active',
  Background = 'background',
  InActive = 'inactive'
}

class AppStore {
  status: AppStatus = AppStatus.Active

  get isActive() {
    return this.status === AppStatus.Active
  }

  setStatus(status: AppStatus) {
    this.status = status
  }
}

export const appStore = new AppStore()
