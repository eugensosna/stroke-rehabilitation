// Google Identity Services (GIS): кнопка "Sign in with Google", що повертає ID token (credential).
// Client ID задається змінною VITE_GOOGLE_CLIENT_ID; у Docker-збірці це плейсхолдер,
// який docker-entrypoint.sh замінює під час старту контейнера.

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
  }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export function googleClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  // незамінений плейсхолдер __VITE_...__ вважаємо "не задано"
  if (!id || id.startsWith('__')) return null
  return id
}

let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GIS_SRC
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = null
        reject(new Error('Failed to load Google Identity Services'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

export async function renderGoogleButton(
  parent: HTMLElement,
  onCredential: (credential: string) => void,
): Promise<boolean> {
  const clientId = googleClientId()
  if (!clientId) return false
  await loadScript()
  const gis = window.google!.accounts.id
  gis.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
    ux_mode: 'popup',
  })
  gis.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: parent.clientWidth || 300,
  })
  return true
}
