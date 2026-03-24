function readStoredAuth() {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }

  try {
    const user = localStorage.getItem("fg_user");
    const token = localStorage.getItem("fg_token");

    return {
      user: user ? JSON.parse(user) : null,
      token: token || null,
    };
  } catch {
    return { user: null, token: null };
  }
}

let state = readStoredAuth();
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function setAuth({ user, token }) {
  state = { user: user || null, token: token || null };

  if (state.user && state.token) {
    localStorage.setItem("fg_user", JSON.stringify(state.user));
    localStorage.setItem("fg_token", state.token);
  } else {
    localStorage.removeItem("fg_user");
    localStorage.removeItem("fg_token");
  }

  notify();
}

export function logout() {
  setAuth({ user: null, token: null });
}

export function getAuth() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", () => {
    state = readStoredAuth();
    notify();
  });
}
