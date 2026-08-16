import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config";

export interface UserTokenPayload {
  sub: string;
  uid: number;
  role: string;
  type: "access";
}

export function signUserAccessToken(userId: number, role: string): string {
  const payload: UserTokenPayload = { sub: String(userId), uid: userId, role, type: "access" };
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl as SignOptions["expiresIn"],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

export function verifyUserAccessToken(token: string): UserTokenPayload {
  const decoded = jwt.verify(token, config.jwt.accessSecret, {
    algorithms: ["HS256"],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as jwt.JwtPayload;
  if (decoded.type !== "access") throw new jwt.JsonWebTokenError("bad token type");
  return decoded as unknown as UserTokenPayload;
}

export interface AdminTokenPayload {
  sub: string;
  uid: number;
  sid: number;
  type: "admin-access";
}

export function signAdminAccessToken(adminId: number, sessionId: number): string {
  const payload: AdminTokenPayload = { sub: String(adminId), uid: adminId, sid: sessionId, type: "admin-access" };
  return jwt.sign(payload, config.admin.jwtSecret, {
    expiresIn: config.admin.accessTtl as SignOptions["expiresIn"],
    issuer: config.admin.issuer,
    audience: config.admin.audience,
  });
}

export function verifyAdminAccessToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, config.admin.jwtSecret, {
    algorithms: ["HS256"],
    issuer: config.admin.issuer,
    audience: config.admin.audience,
  }) as jwt.JwtPayload;
  if (decoded.type !== "admin-access") throw new jwt.JsonWebTokenError("bad token type");
  return decoded as unknown as AdminTokenPayload;
}
