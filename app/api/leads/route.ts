import { NextRequest, NextResponse } from "next/server";
import { Prisma, LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validation";
import { getSession } from "@/lib/auth";

// PUBLIC — create a lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const lead = await prisma.lead.create({
      data: parsed.data,
      select: { id: true, createdAt: true },
    });

    return NextResponse.json(
      { message: "Lead received", id: lead.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/leads", error);
    return NextResponse.json(
      { error: "Could not save your enquiry. Please try again." },
      { status: 500 }
    );
  }
}

// PROTECTED — list leads
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: Prisma.LeadWhereInput = {};
    const and: Prisma.LeadWhereInput[] = [];

    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (status && status in LeadStatus) {
      and.push({ status: status as LeadStatus });
    }

    if (and.length) where.AND = and;

    const [items, counts] = await prisma.$transaction([
      prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.lead.groupBy({ by: ["status"], _count: true }),
    ]);

    return NextResponse.json({ items, counts });
  } catch (error) {
    console.error("GET /api/leads", error);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 }
    );
  }
}