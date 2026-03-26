import StellarSdk from "@stellar/stellar-sdk";

export interface FeePayerAccount {
  secret: string;
  publicKey: string;
  keypair: any;
}

export interface Config {
  feePayerAccounts: FeePayerAccount[];
  baseFee: number;
  feeMultiplier: number;
  networkPassphrase: string;
  horizonUrl?: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  allowedOrigins: string[];
  alerting: AlertingConfig;
}

export interface AlertEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string[];
}

export interface AlertingConfig {
  lowBalanceThresholdXlm?: number;
  checkIntervalMs: number;
  cooldownMs: number;
  slackWebhookUrl?: string;
  email?: AlertEmailConfig;
}

export function loadConfig(): Config {
  const rawSecrets = process.env.FLUID_FEE_PAYER_SECRET;
  if (!rawSecrets) {
    throw new Error("FLUID_FEE_PAYER_SECRET environment variable is required");
  }

  // Support comma-separated list of secrets
  const secrets = rawSecrets.split(",").map((s) => s.trim()).filter(Boolean);
  if (secrets.length === 0) {
    throw new Error("FLUID_FEE_PAYER_SECRET must contain at least one secret");
  }

  const feePayerAccounts: FeePayerAccount[] = secrets.map((secret) => {
    const keypair = StellarSdk.Keypair.fromSecret(secret);
    return {
      secret,
      publicKey: keypair.publicKey(),
      keypair,
    };
  });

  const baseFee = parseInt(process.env.FLUID_BASE_FEE || "100", 10);
  const feeMultiplier = parseFloat(process.env.FLUID_FEE_MULTIPLIER || "2.0");
  const networkPassphrase =
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015";
  const horizonUrl = process.env.STELLAR_HORIZON_URL;
  const rateLimitWindowMs = parsePositiveInt(
    process.env.FLUID_RATE_LIMIT_WINDOW_MS,
    60_000,
  );
  const rateLimitMax = parsePositiveInt(
    process.env.FLUID_RATE_LIMIT_MAX,
    5,
  );
  const allowedOrigins = parseAllowedOrigins(process.env.FLUID_ALLOWED_ORIGINS);
  const lowBalanceThresholdXlm = parseOptionalNumber(
    process.env.FLUID_LOW_BALANCE_THRESHOLD_XLM,
  );
  const checkIntervalMs = parsePositiveInt(
    process.env.FLUID_LOW_BALANCE_CHECK_INTERVAL_MS,
    60 * 60 * 1000,
  );
  const cooldownMs = parsePositiveInt(
    process.env.FLUID_LOW_BALANCE_ALERT_COOLDOWN_MS,
    6 * 60 * 60 * 1000,
  );
  const slackWebhookUrl = process.env.FLUID_ALERT_SLACK_WEBHOOK_URL?.trim();
  const email = loadAlertEmailConfig();

  return {
    feePayerAccounts,
    baseFee,
    feeMultiplier,
    networkPassphrase,
    horizonUrl,
    rateLimitWindowMs,
    rateLimitMax,
    allowedOrigins,
    alerting: {
      lowBalanceThresholdXlm,
      checkIntervalMs,
      cooldownMs,
      slackWebhookUrl: slackWebhookUrl || undefined,
      email,
    },
  };
}

function loadAlertEmailConfig(): AlertEmailConfig | undefined {
  const host = process.env.FLUID_ALERT_SMTP_HOST?.trim();
  const from = process.env.FLUID_ALERT_EMAIL_FROM?.trim();
  const to = process.env.FLUID_ALERT_EMAIL_TO
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!host || !from || !to || to.length === 0) {
    return undefined;
  }

  return {
    host,
    port: parsePositiveInt(process.env.FLUID_ALERT_SMTP_PORT, 587),
    secure: process.env.FLUID_ALERT_SMTP_SECURE === "true",
    user: process.env.FLUID_ALERT_SMTP_USER?.trim() || undefined,
    pass: process.env.FLUID_ALERT_SMTP_PASS?.trim() || undefined,
    from,
    to,
  };
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Round-robin counter (module-level, safe for single-threaded Node.js event loop)
let rrIndex = 0;

/**
 * Pick the next fee payer account using Round Robin strategy.
 */
export function pickFeePayerAccount(config: Config): FeePayerAccount {
  const accounts = config.feePayerAccounts;
  const account = accounts[rrIndex % accounts.length];
  rrIndex = (rrIndex + 1) % accounts.length;
  return account;
}
