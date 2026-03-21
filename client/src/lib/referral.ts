export type ReferralPayload = {
  referralCode?: string;
  referrerTelegramId?: string;
  referrerUsername?: string;
  referralSource?: string;
};

const STORAGE_KEY = "iriston_referral";

function sanitize(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readReferralFromUrl(): ReferralPayload {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    referralCode: sanitize(params.get("ref") || params.get("referral")),
    referrerTelegramId: sanitize(params.get("ref_tg_id")),
    referrerUsername: sanitize(params.get("ref_user")),
    referralSource: sanitize(params.get("utm_source")) || "site_ref_link",
  };
}

export function persistReferral(payload: ReferralPayload) {
  if (typeof window === "undefined") return;
  if (!payload.referralCode && !payload.referrerTelegramId && !payload.referrerUsername) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readPersistedReferral(): ReferralPayload {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ReferralPayload;
  } catch {
    return {};
  }
}

export function resolveReferralPayload(): ReferralPayload {
  const fromUrl = readReferralFromUrl();
  if (fromUrl.referralCode || fromUrl.referrerTelegramId || fromUrl.referrerUsername) {
    persistReferral(fromUrl);
    return fromUrl;
  }
  return readPersistedReferral();
}
