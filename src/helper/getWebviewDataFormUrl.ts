export function getWebviewDataFromUrl(param = 'data'): string | null {
  const params = new URLSearchParams(window.location.search)
  const data = params.get(param)
  return data
}

export function getAuthTokenFromUrl(param = 'auth'): string | null {
  const params = new URLSearchParams(window.location.search)
  const data = params.get(param)
  return data
}
