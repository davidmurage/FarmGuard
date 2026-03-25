const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

function safelyParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildErrorMessage(payload) {
  return typeof payload === "object" && payload?.message
    ? payload.message
    : typeof payload === "string" && payload
      ? payload
      : "Request failed.";
}

async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? safelyParseJson(text) : null;

  if (!response.ok) {
    throw new Error(buildErrorMessage(payload));
  }

  return payload;
}

function getDownloadFilename(response, fallback) {
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return match?.[1] || fallback;
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

export function apiDelete(path, options = {}) {
  return apiRequest(path, { ...options, method: "DELETE" });
}

export async function apiDownload(path, { auth = false, headers = {}, filename = "download" } = {}) {
  const token = auth ? localStorage.getItem("fg_token") : null;
  const response = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const payload = text ? safelyParseJson(text) : null;
    throw new Error(buildErrorMessage(payload));
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadName = getDownloadFilename(response, filename);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = downloadName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);

  return { filename: downloadName };
}

export function extractApiErrorMessage(error, fallback = "Something went wrong.") {
  return error instanceof Error && error.message ? error.message : fallback;
}
