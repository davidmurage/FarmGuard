export function getToken() {
  return localStorage.getItem("fg_token");
}

export function getUser() {
  const value = localStorage.getItem("fg_user");

  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function isAuthed() {
  return Boolean(getToken() && getUser());
}

export function hasRole(expected) {
  const user = getUser();

  if (!user) {
    return false;
  }

  return Array.isArray(expected) ? expected.includes(user.role) : user.role === expected;
}

export function roleHome(role) {
  switch (role) {
    case "FARMER":
      return "/dashboard/farmer";
    case "VET":
      return "/dashboard/vet";
    case "ADMIN":
      return "/dashboard/admin";
    default:
      return "/dashboard/farmer";
  }
}
