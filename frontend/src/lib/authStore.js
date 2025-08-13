// No React Context. Simple external store + localStorage.
let state = (() => {
  try {
    const user = localStorage.getItem('fg_user')
    const token = localStorage.getItem('fg_token')
    return { user: user ? JSON.parse(user) : null, token: token || null }
  } catch { return { user: null, token: null } }
})()

const listeners = new Set()
function notify() { for (const l of listeners) l(state) }

export function setAuth({ user, token }) {
  state = { user, token }
  localStorage.setItem('fg_user', JSON.stringify(user))
  localStorage.setItem('fg_token', token)
  notify()
}
export function logout() {
  state = { user: null, token: null }
  localStorage.removeItem('fg_user'); localStorage.removeItem('fg_token')
  notify()
}
export function getAuth() { return state }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
