const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(value) {
  let phoneNumber = String(value ?? "").trim();

  if (!phoneNumber) {
    return "";
  }

  phoneNumber = phoneNumber.replace(/[()\s-]/g, "");

  if (phoneNumber.startsWith("00")) {
    phoneNumber = `+${phoneNumber.slice(2)}`;
  } else if (phoneNumber.startsWith("254") && !phoneNumber.startsWith("+")) {
    phoneNumber = `+${phoneNumber}`;
  } else if (phoneNumber.startsWith("0") && phoneNumber.length === 10) {
    phoneNumber = `+254${phoneNumber.slice(1)}`;
  } else if (!phoneNumber.startsWith("+") && /^\d+$/.test(phoneNumber)) {
    phoneNumber = `+${phoneNumber}`;
  }

  return E164_REGEX.test(phoneNumber) ? phoneNumber : "";
}

export function isValidPhoneNumber(value) {
  return Boolean(normalizePhoneNumber(value));
}
