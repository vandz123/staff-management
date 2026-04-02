import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload } from "./auth";

export async function getAuth(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(handler: (req: NextRequest, auth: JWTPayload) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, auth);
  };
}

export function requireRole(...roles: Array<"admin" | "staff">) {
  return (handler: (req: NextRequest, auth: JWTPayload) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const auth = await getAuth(req);
      if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!roles.includes(auth.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return handler(req, auth);
    };
  };
}
