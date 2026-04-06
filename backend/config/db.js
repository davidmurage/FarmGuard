import dns from "dns";

import mongoose from "mongoose";

import { env } from "./env.js";

const PUBLIC_DNS_FALLBACK = ["1.1.1.1", "8.8.8.8"];

function isSrvMongoUri(uri) {
  return String(uri || "").startsWith("mongodb+srv://");
}

function isDnsLookupError(error) {
  const details = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();

  return ["eservfail", "enotfound", "querytxt", "querysrv", "etimeout"].some((marker) => details.includes(marker));
}

function setDnsServers(servers, reason) {
  if (!servers.length) {
    return;
  }

  dns.setServers(servers);
  console.log(`MongoDB DNS resolver set to ${servers.join(", ")}${reason ? ` (${reason})` : ""}`);
}

async function resetMongooseConnection() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function openMongoConnection(uri, label) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
  });

  console.log(`MongoDB connected${label ? ` (${label})` : ""}`);
}

function buildMongoConnectionError(error, { triedPublicDnsFallback = false, triedDirectUri = false } = {}) {
  if (!isDnsLookupError(error)) {
    return error;
  }

  const suggestions = [];

  if (!triedPublicDnsFallback && !env.mongoDnsServers.length) {
    suggestions.push("retry with public DNS resolvers");
  }

  if (!triedDirectUri && isSrvMongoUri(env.mongoUri)) {
    suggestions.push("set MONGODB_DIRECT_URI to a non-SRV Atlas connection string");
  }

  if (!env.mongoDnsServers.length) {
    suggestions.push("set MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8");
  }

  const guidance = suggestions.length ? ` Next steps: ${suggestions.join(" or ")}.` : "";

  return new Error(`MongoDB Atlas DNS lookup failed while resolving SRV/TXT records.${guidance}`);
}

export async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  const manuallyConfiguredDns = env.mongoDnsServers.length > 0;
  const primaryLabel = isSrvMongoUri(env.mongoUri) ? "Atlas SRV" : "standard URI";

  if (manuallyConfiguredDns) {
    setDnsServers(env.mongoDnsServers, "from MONGO_DNS_SERVERS");
  }

  try {
    await openMongoConnection(env.mongoUri, primaryLabel);
    return;
  } catch (primaryError) {
    let lastError = primaryError;

    if (!isSrvMongoUri(env.mongoUri) || !isDnsLookupError(lastError)) {
      throw lastError;
    }

    if (!manuallyConfiguredDns) {
      try {
        await resetMongooseConnection();
        setDnsServers(PUBLIC_DNS_FALLBACK, "automatic SRV retry");
        await openMongoConnection(env.mongoUri, "Atlas SRV via public DNS");
        return;
      } catch (publicDnsError) {
        lastError = publicDnsError;
      }
    }

    if (env.mongoDirectUri) {
      try {
        await resetMongooseConnection();
        await openMongoConnection(env.mongoDirectUri, "direct URI fallback");
        return;
      } catch (directError) {
        throw buildMongoConnectionError(directError, {
          triedPublicDnsFallback: !manuallyConfiguredDns,
          triedDirectUri: true,
        });
      }
    }

    throw buildMongoConnectionError(lastError, {
      triedPublicDnsFallback: !manuallyConfiguredDns,
      triedDirectUri: false,
    });
  }
}
