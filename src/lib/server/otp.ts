import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export function createDeliveryOtp() {
  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code, salt, 64).toString("hex");
  return { code, hash: `${salt}:${hash}` };
}

export function verifyDeliveryOtp(code: string, storedHash: string | null) {
  if (!storedHash || !/^\d{6}$/.test(code)) return false;
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(code, salt, 64).toString("hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
