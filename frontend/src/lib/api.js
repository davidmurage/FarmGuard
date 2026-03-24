const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

function safelyParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? safelyParseJson(text) : null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload?.message
        ? payload.message
        : typeof payload === "string" && payload
          ? payload
          : "Request failed.";

    throw new Error(message);
  }

  return payload;
}

export async function apiRequest(path, { method = "GET", data, auth = false, headers = {} } = {}) {
  const token = auth ? localStorage.getItem("fg_token") : null;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  return parseResponse(response);
}

export function apiGet(path, options = {}) {
  return apiRequest(path, { ...options, method: "GET" });
}

export function apiPost(path, data, options = {}) {
  return apiRequest(path, { ...options, method: "POST", data });
}

export function apiPatch(path, data, options = {}) {
  return apiRequest(path, { ...options, method: "PATCH", data });
}

export function extractApiErrorMessage(error, fallback = "Something went wrong.") {
  return error instanceof Error && error.message ? error.message : fallback;
}
