export type SessionClaims = {
  openId: string;
  appId: string;
  name: string;
};

export function parseSessionClaims(
  payload: Record<string, unknown>,
  expectedAppId: string,
): SessionClaims | null {
  const { openId, appId, name } = payload;

  if (typeof openId !== "string" || openId.length === 0) return null;
  if (typeof appId !== "string" || appId.length === 0) return null;
  if (typeof name !== "string") return null;
  if (!expectedAppId || appId !== expectedAppId) return null;

  return { openId, appId, name };
}
