import makeWASocket, { DisconnectReason, useMultiFileAuthState as createMultiFileAuthState } from "@whiskeysockets/baileys";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import pino from "pino";
import QRCode from "qrcode";

const port = Number(process.env.GATEWAY_PORT || 3100);
const apiToken = process.env.WHATSAPP_GATEWAY_TOKEN || "";
const webhookUrl = process.env.WHATSAPP_APP_WEBHOOK_URL || "";
const webhookSecret = process.env.WHATSAPP_GATEWAY_WEBHOOK_SECRET || "";
const sessionDir = process.env.WHATSAPP_SESSION_DIR || "/data/sessions";
const logger = pino({ level: process.env.LOG_LEVEL || "warn" });
const sessions = new Map();
const companyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!apiToken || apiToken.length < 32) throw new Error("WHATSAPP_GATEWAY_TOKEN debe contener al menos 32 caracteres.");
if (!webhookSecret || webhookSecret.length < 32) throw new Error("WHATSAPP_GATEWAY_WEBHOOK_SECRET debe contener al menos 32 caracteres.");
if (!webhookUrl) throw new Error("Falta WHATSAPP_APP_WEBHOOK_URL.");

await mkdir(sessionDir, { recursive: true, mode: 0o700 });

function secureEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(request) {
  const authorization = request.headers.authorization || "";
  return authorization.startsWith("Bearer ") && secureEqual(authorization.slice(7), apiToken);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65_536) throw new Error("El cuerpo excede el límite permitido.");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function notifyApp(event) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", webhookSecret).update(`${timestamp}.${body}`).digest("hex");
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tudelivery-Timestamp": timestamp,
        "X-Tudelivery-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) logger.error({ status: response.status, eventType: event.type }, "Application webhook rejected the event");
  } catch (error) {
    logger.error({ err: error, eventType: event.type }, "Application webhook is unreachable");
  }
}

function sessionSnapshot(session) {
  return {
    connectionStatus: session.status,
    phoneNumber: session.phoneNumber,
    qrDataUrl: session.status === "pending" ? session.qrDataUrl : null,
    updatedAt: session.updatedAt,
  };
}

function extractText(message) {
  return message?.conversation
    || message?.extendedTextMessage?.text
    || message?.imageMessage?.caption
    || message?.videoMessage?.caption
    || message?.buttonsResponseMessage?.selectedDisplayText
    || message?.listResponseMessage?.title
    || message?.templateButtonReplyMessage?.selectedDisplayText
    || undefined;
}

function messageType(message) {
  if (!message) return "unknown";
  if (message.conversation || message.extendedTextMessage) return "text";
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.locationMessage || message.liveLocationMessage) return "location";
  if (message.contactMessage || message.contactsArrayMessage) return "contact";
  if (message.stickerMessage) return "sticker";
  return "unknown";
}

async function startSocket(session) {
  const authPath = path.join(sessionDir, session.companyId);
  await mkdir(authPath, { recursive: true, mode: 0o700 });
  const { state, saveCreds } = await createMultiFileAuthState(authPath);
  session.status = "connecting";
  session.updatedAt = new Date().toISOString();

  const socket = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["Tudelivery", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });
  session.socket = socket;
  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      session.status = "pending";
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 320, errorCorrectionLevel: "M" });
      session.updatedAt = new Date().toISOString();
    }

    if (connection === "open") {
      const phoneNumber = socket.user?.id?.split(":")[0]?.replace(/\D/g, "") || null;
      session.status = "connected";
      session.phoneNumber = phoneNumber;
      session.qrDataUrl = null;
      session.updatedAt = new Date().toISOString();
      await notifyApp({ type: "channel.status", companyId: session.companyId, connectionStatus: "connected", phoneNumber });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut || session.manualLogout;
      logger.warn({ companyId: session.companyId, statusCode, reason: lastDisconnect?.error?.message }, "WhatsApp socket closed");
      session.socket = null;
      session.qrDataUrl = null;
      session.status = loggedOut ? "disconnected" : "connecting";
      session.updatedAt = new Date().toISOString();
      await notifyApp({ type: "channel.status", companyId: session.companyId, connectionStatus: loggedOut ? "disconnected" : "pending", phoneNumber: loggedOut ? null : session.phoneNumber });
      if (!loggedOut) setTimeout(() => void ensureSession(session.companyId), 1_500);
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const item of messages) {
      if (item.key.fromMe || !item.key.id || !item.message) continue;
      const remoteJid = item.key.remoteJidAlt || item.key.remoteJid || "";
      if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) continue;
      const from = remoteJid.split("@")[0].split(":")[0].replace(/\D/g, "");
      if (!from) continue;
      const timestamp = Number(item.messageTimestamp || Math.floor(Date.now() / 1000));
      await notifyApp({
        type: "message.received",
        companyId: session.companyId,
        message: {
          messageId: item.key.id,
          from,
          timestamp: new Date(timestamp * 1000).toISOString(),
          type: messageType(item.message),
          text: extractText(item.message),
          customerName: item.pushName || undefined,
        },
      });
    }
  });
}

async function ensureSession(companyId) {
  let session = sessions.get(companyId);
  if (!session) {
    session = { companyId, socket: null, status: "disconnected", phoneNumber: null, qrDataUrl: null, updatedAt: new Date().toISOString(), manualLogout: false, startPromise: null };
    sessions.set(companyId, session);
  }
  session.manualLogout = false;
  if (!session.socket && !session.startPromise) {
    session.startPromise = startSocket(session).finally(() => { session.startPromise = null; });
  }
  await session.startPromise;
  return session;
}

async function disconnectSession(companyId) {
  const session = sessions.get(companyId);
  if (session) {
    session.manualLogout = true;
    try { await session.socket?.logout(); } catch (error) { logger.warn({ err: error }, "WhatsApp logout returned an error"); }
    sessions.delete(companyId);
  }
  await rm(path.join(sessionDir, companyId), { recursive: true, force: true });
  await notifyApp({ type: "channel.status", companyId, connectionStatus: "disconnected", phoneNumber: null });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }
    if (!authorized(request)) {
      sendJson(response, 401, { error: "No autorizado." });
      return;
    }
    const match = url.pathname.match(/^\/v1\/sessions\/([^/]+)(?:\/(connect|send))?$/);
    if (!match || !companyPattern.test(match[1])) {
      sendJson(response, 404, { error: "Ruta no encontrada." });
      return;
    }
    const [, companyId, action] = match;

    if (request.method === "POST" && action === "connect") {
      sendJson(response, 202, sessionSnapshot(await ensureSession(companyId)));
      return;
    }
    if (request.method === "GET" && !action) {
      const session = sessions.get(companyId);
      sendJson(response, 200, session ? sessionSnapshot(session) : {
        connectionStatus: "disconnected",
        phoneNumber: null,
        qrDataUrl: null,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    if (request.method === "POST" && action === "send") {
      const session = await ensureSession(companyId);
      if (session.status !== "connected" || !session.socket) {
        sendJson(response, 409, { error: "El número de esta empresa todavía no está conectado." });
        return;
      }
      const body = await readJson(request);
      const to = String(body.to || "").replace(/\D/g, "");
      const text = String(body.body || "").trim();
      if (!to || !text || text.length > 4096) {
        sendJson(response, 400, { error: "Destinatario o mensaje inválido." });
        return;
      }
      const result = await session.socket.sendMessage(`${to}@s.whatsapp.net`, { text, linkPreview: body.previewUrl === true });
      const providerMessageId = result?.key?.id;
      if (!providerMessageId) throw new Error("WhatsApp no confirmó el identificador del mensaje enviado.");
      sendJson(response, 202, { providerMessageId, acceptedAt: new Date().toISOString() });
      return;
    }
    if (request.method === "DELETE" && !action) {
      await disconnectSession(companyId);
      sendJson(response, 200, { disconnected: true });
      return;
    }
    sendJson(response, 405, { error: "Método no permitido." });
  } catch (error) {
    logger.error({ err: error }, "Gateway request failed");
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Error interno del gateway." });
  }
});

server.listen(port, "0.0.0.0", () => logger.info({ port }, "WhatsApp gateway ready"));

for (const entry of await readdir(sessionDir, { withFileTypes: true })) {
  if (entry.isDirectory() && companyPattern.test(entry.name)) void ensureSession(entry.name);
}
