import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Encrypts provider tokens before persistence. The key never leaves server code. */
export function encryptWhatsAppSecret(value: string) {
  const encodedKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("Falta WHATSAPP_TOKEN_ENCRYPTION_KEY para proteger el token de WhatsApp.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

/** Decrypts a token only inside a server route immediately before calling Meta. */
export function decryptWhatsAppSecret(value: string) {
  const encodedKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("Falta WHATSAPP_TOKEN_ENCRYPTION_KEY para leer el token de WhatsApp.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes.");
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) throw new Error("El token de WhatsApp almacenado no tiene un formato válido.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
