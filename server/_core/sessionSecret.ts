const MIN_PRODUCTION_SECRET_LENGTH = 32;

const KNOWN_WEAK_SECRETS = new Set([
  "barahub",
  "changeme",
  "change-me",
  "development",
  "jwt-secret",
  "jwtsecret",
  "manus",
  "password",
  "secret",
  "test",
]);

export class SessionSecretError extends Error {
  constructor() {
    super(
      "A secure session secret is required in production: configure MANUS_JWT_SECRET or JWT_SECRET with at least 32 characters.",
    );
    this.name = "SessionSecretError";
  }
}

export type SessionSecretValidationInput = {
  secret: string | null | undefined;
  nodeEnv: string | null | undefined;
};

export function assertProductionSessionSecret({
  secret,
  nodeEnv,
}: SessionSecretValidationInput): void {
  if (nodeEnv !== "production") return;

  const candidate = typeof secret === "string" ? secret.trim() : "";
  const isTooShort = candidate.length < MIN_PRODUCTION_SECRET_LENGTH;
  const isKnownWeak = KNOWN_WEAK_SECRETS.has(candidate.toLowerCase());
  const hasTooFewDistinctCharacters = new Set(candidate).size < 4;
  const hasRepeatedPattern = /^(.{1,16})\1+$/.test(candidate);

  if (isTooShort || isKnownWeak || hasTooFewDistinctCharacters || hasRepeatedPattern) {
    throw new SessionSecretError();
  }
}
