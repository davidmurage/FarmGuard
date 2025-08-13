export function getToken() {
  return localStorage.getItem("fg_token");
}
export function getUser() {
  const u = localStorage.getItem("fg_user");
  try { return u ? JSON.parse(u) : null; } catch { return null; }
}
export function isAuthed() {
  return Boolean(getToken() && getUser());
}
export function logout() {
  localStorage.removeItem("fg_token");
  localStorage.removeItem("fg_user");
}
export function hasRole(expected) {
  const u = getUser();
  if (!u) return false;
  return Array.isArray(expected) ? expected.includes(u.role) : u.role === expected;
}
export function roleHome(role) {
  switch (role) {
    case "FARMER": return "/dashboard/farmer";
    case "VET":    return "/dashboard/vet";
    case "ADMIN":  return "/dashboard/admin";
    default:       return "/dashboard/farmer";
  }
}
