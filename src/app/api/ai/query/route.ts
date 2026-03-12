import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function getSystemContext(auth: { role: string; employeeId?: string | null; userId: string }) {
  // 1. All HR policy documents
  const policies = await prisma.hrDocument.findMany({ orderBy: { title: "asc" } });
  const policyContext = policies.map(p =>
    `=== ${p.title} (${p.category || "General"}) ===\n${p.content || "No content available."}`
  ).join("\n\n");

  // 2. Role-specific data
  let dataContext = "";

  if (auth.role === "admin" || auth.role === "manager") {
    // Org-wide employee summary
    const employees = await prisma.employee.findMany({
      include: { department: true, position: true },
    });
    const activeCount = employees.filter(e => e.status === "active").length;
    dataContext += `\n\nEMPLOYEE DATA:\n- Total employees: ${employees.length}\n- Active: ${activeCount}\n- Inactive: ${employees.length - activeCount}\n`;
    dataContext += employees.map(e =>
      `  • ${e.firstName} ${e.lastName} | Dept: ${e.department?.name || "N/A"} | Position: ${e.position?.name || "N/A"} | Status: ${e.status} | Leave balance: ${e.annualLeaveBalance} days | Salary: ${e.baseSalary ? (e.baseSalary / 1_000_000).toFixed(1) + "M VND" : "N/A"}`
    ).join("\n");

    // Pending requests
    const pendingLeave = await prisma.leaveRequest.count({ where: { status: "pending" } });
    const pendingOT = await prisma.overtimeRequest.count({ where: { status: "pending" } });
    dataContext += `\n\nPENDING REQUESTS:\n- Leave requests: ${pendingLeave}\n- Overtime requests: ${pendingOT}`;

    // Training status
    const trainings = await prisma.employeeTraining.findMany({
      include: { employee: true, training: true },
    });
    const completed = trainings.filter(t => t.status === "completed").length;
    const pending = trainings.filter(t => t.status === "pending").length;
    dataContext += `\n\nTRAINING STATUS:\n- Completed: ${completed}\n- Pending: ${pending}`;
  }

  if (auth.role === "staff" && auth.employeeId) {
    // Personal data only
    const emp = await prisma.employee.findUnique({
      where: { id: auth.employeeId },
      include: { department: true, position: true },
    });
    if (emp) {
      dataContext += `\n\nYOUR EMPLOYEE INFO:\n- Name: ${emp.firstName} ${emp.lastName}\n- Department: ${emp.department?.name || "N/A"}\n- Position: ${emp.position?.name || "N/A"}\n- Annual leave balance: ${emp.annualLeaveBalance} days\n- Base salary: ${emp.baseSalary ? (emp.baseSalary / 1_000_000).toFixed(1) + "M VND/month" : "N/A"}`;
    }

    // Personal leave requests
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: auth.employeeId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    if (leaves.length > 0) {
      dataContext += `\n\nYOUR RECENT LEAVE REQUESTS:`;
      for (const l of leaves) {
        dataContext += `\n  • ${l.leaveType} | ${l.startDate.toISOString().split("T")[0]} to ${l.endDate.toISOString().split("T")[0]} | Status: ${l.status}`;
      }
    }

    // Personal training
    const myTrainings = await prisma.employeeTraining.findMany({
      where: { employeeId: auth.employeeId },
      include: { training: true },
    });
    if (myTrainings.length > 0) {
      dataContext += `\n\nYOUR TRAINING:`;
      for (const t of myTrainings) {
        dataContext += `\n  • ${t.training.title} | Status: ${t.status}`;
      }
    }
  }

  return { policyContext, dataContext };
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({
      answer: "HR Assistant is not configured. Please add GEMINI_API_KEY to the environment.",
      sources: [],
    });
  }

  try {
    const { policyContext, dataContext } = await getSystemContext(auth);

    const systemPrompt = `You are an HR Assistant for a staff management system. You answer questions ONLY based on the company's internal HR policy documents and employee data provided below. Do not make up information. If you cannot find the answer in the provided context, say so clearly.

Your user's role is: ${auth.role}

--- HR POLICY DOCUMENTS ---
${policyContext}

--- SYSTEM DATA ---
${dataContext}

RULES:
1. Answer concisely and professionally.
2. Reference the specific policy document name when citing rules.
3. For staff users, only share their personal information.
4. For admin/manager users, you can share organization-wide data.
5. Use bullet points for clarity when listing multiple items.
6. If asked about something not covered in the policies, say "This is not covered in the current company policies. Please consult HR directly."`;

    const requestBody = JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\nUser question: " + question }] },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Retry logic for rate limiting (429)
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (response.status === 429 && attempt < 2) {
        // Wait with exponential backoff: 2s, 4s
        const waitMs = (attempt + 1) * 2000;
        console.log(`Gemini rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 0;
      const errorText = response ? await response.text() : "No response";
      console.error("Gemini API error:", status, errorText);

      if (status === 429) {
        return NextResponse.json({
          answer: "The HR assistant is currently rate-limited. The free Gemini API has a limited number of requests per minute. Please wait about 30-60 seconds and try again.",
          sources: [],
        });
      }

      return NextResponse.json({
        answer: "Sorry, the HR assistant encountered an error. Please try again later.",
        sources: [],
      });
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from the assistant.";

    // Extract which policy documents were likely referenced
    const allDocs = await prisma.hrDocument.findMany({ select: { title: true } });
    const sources = allDocs
      .filter(d => answer.toLowerCase().includes(d.title.toLowerCase()))
      .map(d => d.title);

    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error("AI query error:", error);
    return NextResponse.json({
      answer: "Sorry, an unexpected error occurred. Please try again.",
      sources: [],
    });
  }
}
