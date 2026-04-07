// =============================================
// JWT Auth Middleware for Hono + Cloudflare Workers
// Uses 'jose' for JWT signing/verification
// =============================================

import { Context, Next } from "hono";
import * as jose from "jose";
import type { Env } from "./index";

export interface TokenPayload {
  sub: string; // username
  empresaId: number;
  iat: number;
  exp: number;
}

/**
 * Sign a JWT token with username and empresaId.
 */
export async function signToken(username: string, empresaId: number, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ sub: username, empresaId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

/**
 * Verify and decode a JWT token.
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key);
  return payload as unknown as TokenPayload;
}

/**
 * Auth middleware — extracts JWT from Authorization header,
 * verifies it, and sets `empresaId` and `username` on context.
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ message: "Token requerido" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set("empresaId", payload.empresaId);
    c.set("username", payload.sub);
    await next();
  } catch (e) {
    return c.json({ message: "Token inválido o expirado" }, 401);
  }
}
