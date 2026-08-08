export type SessionPayload = {
  v: 1;
  sub: "temporary-admin";
  iat: number;
  exp: number;
};

export const SESSION_COOKIE_NAME: "__Host-lotura_session";
export const SESSION_SUBJECT: "temporary-admin";

export function createSignedSession(input: {
  durationSeconds: number;
  now?: Date | string | number;
  secret: string;
}): Promise<string>;

export function verifySignedSession(
  token: unknown,
  input: {
    maximumDurationSeconds: number;
    now?: Date | string | number;
    secret: string;
  },
): Promise<SessionPayload | null>;
