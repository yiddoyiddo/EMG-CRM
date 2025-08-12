import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  ids: z.array(z.number()).min(1, "No IDs provided"),
});

// DELETE - Bulk delete leads
export async function DELETE(req: NextRequest) {
  try {
    // Some environments strip bodies from DELETE; try to parse, otherwise read from query string
    let data: unknown = undefined;
    try {
      data = await req.json();
    } catch {
      // fallback to query param ids=1,2,3
      const { searchParams } = new URL(req.url);
      const idsParam = searchParams.get("ids");
      if (idsParam) {
        data = { ids: idsParam.split(",").map((s) => Number(s)).filter((n) => !Number.isNaN(n)) };
      }
    }

    const { ids } = bulkDeleteSchema.parse(data);

    const result = await prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json(
      { message: `Deleted ${result.count} leads`, count: result.count },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error bulk deleting leads:", error);
    return NextResponse.json(
      { error: "Failed to bulk delete leads" },
      { status: 500 }
    );
  }
}


