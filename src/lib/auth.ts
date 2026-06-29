import { randomUUID, randomBytes, createHash } from "node:crypto";
import { query, run } from "./db";

export type User = {
  id: number;
  email: string;
  name: string;
};

/**
 * Hash a password with a random salt using SHA-256.
 * NOT production-grade (use bcrypt/argon2 for real apps) but fine for MVP.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return computed === hash;
}

export function createSession(userId: number): string {
  const sessionId = randomUUID();
  run(
    `INSERT INTO sessions (id, user_id) VALUES ('${sessionId}', ${userId})`
  );
  return sessionId;
}

export function getSession(sessionId: string): User | null {
  const rows = query(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = '${sessionId.replace(/'/g, "''")}'`
  );
  return rows.length > 0 ? rows[0] as User : null;
}

export function deleteSession(sessionId: string): void {
  run(`DELETE FROM sessions WHERE id = '${sessionId.replace(/'/g, "''")}'`);
}