import { normalizeCountyKey } from "./locationTargeting.js";

function getTargetRoles(alert) {
  return Array.isArray(alert?.targetRoles) && alert.targetRoles.length ? alert.targetRoles : ["ALL"];
}

function getTargetCountyKeys(alert) {
  return Array.isArray(alert?.targetCountyKeys)
    ? alert.targetCountyKeys.map((value) => normalizeCountyKey(value)).filter(Boolean)
    : [];
}

export function buildRecipientQueryForAlert(alert) {
  const query = {};
  const targetRoles = getTargetRoles(alert);
  const targetCountyKeys = getTargetCountyKeys(alert);

  if (!targetRoles.includes("ALL")) {
    query.role = { $in: targetRoles };
  }

  if (targetCountyKeys.length) {
    query["location.countyKey"] = { $in: targetCountyKeys };
  }

  return query;
}

export function isAlertVisibleToUser(alert, user, { adminBypass = false } = {}) {
  if (adminBypass && user?.role === "ADMIN") {
    return true;
  }

  const targetRoles = getTargetRoles(alert);

  if (!targetRoles.includes("ALL") && !targetRoles.includes(user?.role)) {
    return false;
  }

  const targetCountyKeys = getTargetCountyKeys(alert);

  if (!targetCountyKeys.length) {
    return true;
  }

  const userCountyKey = normalizeCountyKey(user?.location?.countyKey || user?.location?.county);
  return Boolean(userCountyKey) && targetCountyKeys.includes(userCountyKey);
}
