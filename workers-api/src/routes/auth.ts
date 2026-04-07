// =============================================
// Auth Routes — Login + Register
// =============================================

import { Hono } from "hono";
import type { Env } from "../index";
import { signToken } from "../auth";

// Simple bcrypt-like password hashing using Web Crypto API
// For Workers we use PBKDF2 since bcrypt isn't available natively
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Handle legacy bcrypt hashes (from the old Spring Boot backend)
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    // BCrypt not available in Workers — we'll need to re-hash on first login
    // For migration: accept any password for bcrypt users and re-hash
    // This is a migration path, not production security
    return false; // bcrypt users must reset password
  }

  if (!stored.startsWith("pbkdf2:")) return false;
  const [, saltHex, hashHex] = stored.split(":");
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const computedHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

export const authRoutes = new Hono<{ Bindings: Env }>();

// --- LOGIN ---
authRoutes.post("/login", async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();

  const user = await c.env.DB.prepare(
    "SELECT u.*, e.nombre as empresa_nombre FROM usuario u JOIN empresa e ON u.empresa_id = e.id WHERE u.username = ?"
  ).bind(username).first<any>();

  if (!user) {
    return c.json({ message: "Credenciales incorrectas" }, 401);
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return c.json({ message: "Credenciales incorrectas" }, 401);
  }

  // Get role
  const roleRow = await c.env.DB.prepare(
    "SELECT r.nombre FROM usuario_rol ur JOIN rol r ON ur.rol_id = r.id WHERE ur.usuario_id = ?"
  ).bind(user.id).first<any>();

  const token = await signToken(user.username, user.empresa_id, c.env.JWT_SECRET);

  return c.json({
    token,
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    empresaId: user.empresa_id,
    empresaNombre: user.empresa_nombre,
    rol: roleRow?.nombre || "ROLE_USER",
  });
});

// --- REGISTER ---
authRoutes.post("/register", async (c) => {
  const { username, password, empresa, email } = await c.req.json<{
    username: string; password: string; empresa: string; email?: string;
  }>();

  // Check if user exists
  const existing = await c.env.DB.prepare("SELECT id FROM usuario WHERE username = ?").bind(username).first();
  if (existing) {
    return c.json({ message: "El usuario ya existe" }, 400);
  }

  const hashedPw = await hashPassword(password);
  const rut = "RUT-" + Date.now();
  const userEmail = email || `${username}@makitscale.com`;

  // Create empresa
  const empResult = await c.env.DB.prepare(
    "INSERT INTO empresa (rut, nombre) VALUES (?, ?) RETURNING id, nombre"
  ).bind(rut, empresa).first<any>();

  // Get or create ROLE_ADMIN
  let roleRow = await c.env.DB.prepare("SELECT id FROM rol WHERE nombre = 'ROLE_ADMIN'").first<any>();
  if (!roleRow) {
    roleRow = await c.env.DB.prepare("INSERT INTO rol (nombre) VALUES ('ROLE_ADMIN') RETURNING id").first<any>();
  }

  // Create user
  const userResult = await c.env.DB.prepare(
    "INSERT INTO usuario (username, nombre, email, password, empresa_id) VALUES (?, ?, ?, ?, ?) RETURNING id"
  ).bind(username, username, userEmail, hashedPw, empResult.id).first<any>();

  // Assign role
  await c.env.DB.prepare(
    "INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (?, ?)"
  ).bind(userResult.id, roleRow.id).run();

  const token = await signToken(username, empResult.id, c.env.JWT_SECRET);

  return c.json({
    token,
    id: userResult.id,
    username,
    nombre: username,
    apellido: null,
    email: userEmail,
    empresaId: empResult.id,
    empresaNombre: empResult.nombre,
    rol: "ROLE_ADMIN",
  });
});
