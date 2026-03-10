import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { emailOrUsername } = await req.json();
    const input = (emailOrUsername ?? "").trim();
    if (!input) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: input.includes("@")
        ? { employee: { email: input } }
        : { username: input },
      include: { employee: true },
    });

    if (!user) {
      return NextResponse.json({
        status: "notfound",
        message: "No account found with that email or username.",
      });
    }

    const request = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id },
      orderBy: { requestTime: "desc" },
    });

    if (!request) {
      return NextResponse.json({
        status: "notfound",
        message: "No password reset request found for this account.",
      });
    }

    if (request.status === "pending") {
      return NextResponse.json({
        status: "pending",
        message: "Your reset request is pending admin approval.",
      });
    }

    if (request.status === "rejected") {
      return NextResponse.json({
        status: "rejected",
        message: "Your reset request was rejected. Please contact HR or submit a new request.",
      });
    }

    if (request.status === "approved") {
      const expired =
        request.tempPasswordExpiry && request.tempPasswordExpiry < new Date();
      if (expired || !request.generatedPassword) {
        return NextResponse.json({
          status: "expired",
          message:
            "Your temporary password has expired. Please submit a new reset request.",
        });
      }
      return NextResponse.json({
        status: "approved",
        tempPassword: request.generatedPassword,
        message:
          "Your password reset request has been approved. Use the temporary password below to log in and change your password immediately.",
      });
    }

    return NextResponse.json({
      status: "unknown",
      message: "No reset information available.",
    });
  } catch (e) {
    console.error("Check reset status error:", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
