import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "staff-management-secret-key-change-in-production"
);

export type JWTPayload = {
  userId: string;
  username: string;
  role: "admin" | "staff";
  employeeId?: string;
  mustChangePassword?: boolean;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/** Generate a random temporary password: 8 chars, uppercase, lowercase, number, symbol */
export function generateTempPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$%";
  const pick = (arr: string, n: number) =>
    Array.from({ length: n }, () => arr[Math.floor(Math.random() * arr.length)]).join("");
  return (
    pick(uppercase, 2) +
    pick(lowercase, 3) +
    pick(numbers, 2) +
    pick(symbols, 1)
  )
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/** Validate password meets rules: min 8 chars, 1 number, 1 uppercase */
export function validatePasswordRules(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) return { valid: false, message: "Minimum 8 characters required" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "At least one number required" };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "At least one uppercase letter required" };
  return { valid: true };
}
