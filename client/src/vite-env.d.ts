/// <reference types="vite/client" />

// Google Identity Services global
interface GoogleAccountsId {
  initialize: (cfg: {
    client_id:   string
    callback:    (r: { credential: string }) => void
    auto_select?: boolean
  }) => void
  renderButton: (el: HTMLElement, cfg: object) => void
  prompt:  () => void
  cancel:  () => void
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId
    }
  }
}
