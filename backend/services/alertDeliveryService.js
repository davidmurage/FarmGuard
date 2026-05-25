import { env } from "../config/env.js";
import AlertDelivery from "../models/AlertDelivery.js";
import User from "../models/User.js";
import { buildRecipientQueryForAlert } from "../utils/alertAudience.js";
import { normalizePhoneNumber } from "../utils/phoneNumber.js";

const EXTERNAL_ALERT_CHANNELS = ["SMS", "WHATSAPP"];

function truncateText(text, limit) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1).trim()}...`;
}

function buildAlertBody(alert) {
  const segments = [
    `FarmGuard ${alert.riskLevel} alert: ${alert.title}.`,
    alert.locationName ? `Location: ${alert.locationName}.` : "",
    alert.message ? truncateText(alert.message, 420) : "",
    alert.actionItems?.length ? `Action: ${alert.actionItems.join("; ")}.` : "",
  ].filter(Boolean);

  return truncateText(segments.join(" "), 1200);
}

function formatChannelLabel(channel) {
  return channel === "WHATSAPP" ? "WhatsApp" : "SMS";
}

function formatWhatsAppAddress(phoneNumber) {
  const normalizedNumber = normalizePhoneNumber(String(phoneNumber || "").replace(/^whatsapp:/i, ""));
  return normalizedNumber ? `whatsapp:${normalizedNumber}` : "";
}

function buildRecipientAddress(channel, phoneNumber) {
  return channel === "WHATSAPP" ? formatWhatsAppAddress(phoneNumber) : phoneNumber;
}

function createEmptySummary() {
  return {
    providerMode: env.notificationDeliveryMode,
    audienceSize: 0,
    lastAttemptedAt: null,
    sms: { eligible: 0, queued: 0, failed: 0, skipped: 0 },
    whatsapp: { eligible: 0, queued: 0, failed: 0, skipped: 0 },
  };
}

function getSummaryBucket(summary, channel) {
  return channel === "SMS" ? summary.sms : summary.whatsapp;
}

function getExternalChannels(alert) {
  return (alert.deliveryChannels || []).filter((channel) => EXTERNAL_ALERT_CHANNELS.includes(channel));
}

function getPreferenceKey(channel) {
  return channel === "SMS" ? "sms" : "whatsapp";
}

function getProviderConfig(channel) {
  if (env.notificationDeliveryMode === "DISABLED") {
    return {
      available: false,
      provider: "",
      providerMode: "DISABLED",
      reason: `${formatChannelLabel(channel)} delivery is disabled in this environment.`,
    };
  }

  if (env.notificationDeliveryMode === "LOG_ONLY") {
    return {
      available: true,
      provider: "TWILIO_SIMULATED",
      providerMode: "LOG_ONLY",
    };
  }

  if (!env.twilioAccountSid || !env.twilioAuthToken) {
    return {
      available: false,
      provider: "TWILIO",
      providerMode: "TWILIO",
      reason: "Twilio credentials are missing.",
    };
  }

  if (channel === "SMS") {
    if (!env.twilioMessagingServiceSid && !normalizePhoneNumber(env.twilioSmsFrom)) {
      return {
        available: false,
        provider: "TWILIO",
        providerMode: "TWILIO",
        reason: "Configure TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID for SMS delivery.",
      };
    }

    return {
      available: true,
      provider: "TWILIO",
      providerMode: "TWILIO",
    };
  }

  if (channel === "WHATSAPP") {
    if (!formatWhatsAppAddress(env.twilioWhatsAppFrom)) {
      return {
        available: false,
        provider: "TWILIO",
        providerMode: "TWILIO",
        reason: "Configure TWILIO_WHATSAPP_FROM for WhatsApp delivery.",
      };
    }

    return {
      available: true,
      provider: "TWILIO",
      providerMode: "TWILIO",
    };
  }

  return {
    available: false,
    provider: "",
    providerMode: env.notificationDeliveryMode,
    reason: "Unsupported delivery channel.",
  };
}

async function sendViaTwilio({ channel, to, body }) {
  const requestUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    Body: body,
  });

  if (channel === "SMS") {
    if (env.twilioMessagingServiceSid) {
      params.set("MessagingServiceSid", env.twilioMessagingServiceSid);
    } else {
      params.set("From", normalizePhoneNumber(env.twilioSmsFrom));
    }
  } else {
    params.set("From", formatWhatsAppAddress(env.twilioWhatsAppFrom));
  }

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payloadText = await response.text();
  let payload = null;

  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || payloadText || `Twilio request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return {
    providerMessageSid: payload?.sid || "",
    providerStatus: payload?.status || "queued",
  };
}

async function upsertDeliveryLog({
  alertId,
  userId,
  channel,
  status,
  providerMode,
  provider,
  providerStatus,
  recipientAddress,
  providerMessageSid,
  errorMessage,
}) {
  await AlertDelivery.findOneAndUpdate(
    { alert: alertId, user: userId, channel },
    {
      $set: {
        status,
        providerMode,
        provider,
        providerStatus,
        recipientAddress,
        providerMessageSid,
        errorMessage,
        attemptedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function attemptChannelDelivery({ user, channel, providerConfig, body }) {
  const preferenceKey = getPreferenceKey(channel);
  const phoneNumber = normalizePhoneNumber(user.phoneNumber);
  const recipientAddress = buildRecipientAddress(channel, phoneNumber);

  if (!phoneNumber) {
    return {
      status: "SKIPPED",
      recipientAddress: "",
      providerStatus: "missing_phone",
      providerMessageSid: "",
      errorMessage: "No phone number is stored for this user.",
      provider: providerConfig.provider,
      providerMode: providerConfig.providerMode,
      wasEligible: false,
    };
  }

  if (!user.notificationPreferences?.[preferenceKey]) {
    return {
      status: "SKIPPED",
      recipientAddress,
      providerStatus: "opted_out",
      providerMessageSid: "",
      errorMessage: `${formatChannelLabel(channel)} notifications are turned off for this user.`,
      provider: providerConfig.provider,
      providerMode: providerConfig.providerMode,
      wasEligible: false,
    };
  }

  if (!providerConfig.available) {
    return {
      status: "FAILED",
      recipientAddress,
      providerStatus: "provider_unavailable",
      providerMessageSid: "",
      errorMessage: providerConfig.reason,
      provider: providerConfig.provider,
      providerMode: providerConfig.providerMode,
      wasEligible: true,
    };
  }

  if (providerConfig.providerMode === "LOG_ONLY") {
    return {
      status: "QUEUED",
      recipientAddress,
      providerStatus: "queued",
      providerMessageSid: `sim-${channel.toLowerCase()}-${String(user._id)}-${Date.now()}`,
      errorMessage: "",
      provider: providerConfig.provider,
      providerMode: providerConfig.providerMode,
      wasEligible: true,
    };
  }

  try {
    const result = await sendViaTwilio({
      channel,
      to: recipientAddress,
      body,
    });

    return {
      status: "QUEUED",
      recipientAddress,
      providerStatus: result.providerStatus,
      providerMessageSid: result.providerMessageSid,
      errorMessage: "",
      provider: providerConfig.provider,
      providerMode: providerConfig.providerMode,
      wasEligible: true,
    };
  } catch (error) {
    return {
      status: "FAILED",
      recipientAddress,
      providerStatus: "request_failed",
      providerMessageSid: "",
      errorMessage: error.message,
      provider: providerConfig.provider,
      providerMode: providerConfig.providerMode,
      wasEligible: true,
    };
  }
}

function buildDispatchMessage(alert, summary, deliveryStatus) {
  const externalChannels = getExternalChannels(alert);

  if (!externalChannels.length) {
    return "Alert saved as in-app only.";
  }

  const channelMessages = externalChannels.map((channel) => {
    const bucket = getSummaryBucket(summary, channel);
    return `${formatChannelLabel(channel)} ${bucket.queued} queued, ${bucket.failed} failed, ${bucket.skipped} skipped`;
  });

  if (deliveryStatus === "FAILED") {
    return `Alert published, but external delivery could not reach eligible recipients. ${channelMessages.join(". ")}.`;
  }

  if (deliveryStatus === "PARTIAL") {
    return `Alert published with partial external delivery. ${channelMessages.join(". ")}.`;
  }

  return `Alert published and external delivery queued. ${channelMessages.join(". ")}.`;
}

export async function dispatchAlertDeliveries(alert) {
  const externalChannels = getExternalChannels(alert);
  const summary = createEmptySummary();

  if (!externalChannels.length) {
    alert.deliveryStatus = "NOT_REQUESTED";
    alert.deliverySummary = summary;
    alert.markModified("deliverySummary");
    await alert.save();

    return {
      message: "Alert saved as in-app only.",
      summary,
      deliveryStatus: alert.deliveryStatus,
    };
  }

  const audienceUsers = await User.find(buildRecipientQueryForAlert(alert)).select("_id role name phoneNumber location notificationPreferences");
  summary.audienceSize = audienceUsers.length;
  summary.lastAttemptedAt = new Date();

  const messageBody = buildAlertBody(alert);

  for (const channel of externalChannels) {
    const providerConfig = getProviderConfig(channel);
    const bucket = getSummaryBucket(summary, channel);

    for (const user of audienceUsers) {
      const result = await attemptChannelDelivery({
        user,
        channel,
        providerConfig,
        body: messageBody,
      });

      if (result.wasEligible) {
        bucket.eligible += 1;
      }

      if (result.status === "QUEUED") {
        bucket.queued += 1;
      } else if (result.status === "FAILED") {
        bucket.failed += 1;
      } else {
        bucket.skipped += 1;
      }

      await upsertDeliveryLog({
        alertId: alert._id,
        userId: user._id,
        channel,
        status: result.status,
        providerMode: result.providerMode,
        provider: result.provider,
        providerStatus: result.providerStatus,
        recipientAddress: result.recipientAddress,
        providerMessageSid: result.providerMessageSid,
        errorMessage: result.errorMessage,
      });
    }
  }

  const totalEligible = externalChannels.reduce((sum, channel) => sum + getSummaryBucket(summary, channel).eligible, 0);
  const totalQueued = externalChannels.reduce((sum, channel) => sum + getSummaryBucket(summary, channel).queued, 0);

  alert.deliverySummary = summary;
  alert.deliveryStatus =
    totalEligible === 0
      ? "FAILED"
      : totalQueued === 0
        ? "FAILED"
        : totalQueued < totalEligible
          ? "PARTIAL"
          : "QUEUED";
  alert.markModified("deliverySummary");
  await alert.save();

  return {
    message: buildDispatchMessage(alert, summary, alert.deliveryStatus),
    summary,
    deliveryStatus: alert.deliveryStatus,
  };
}
