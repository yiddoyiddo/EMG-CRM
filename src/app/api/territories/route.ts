import { NextRequest } from "next/server";
import { getAuthenticatedUser, createErrorResponse, createSuccessResponse } from "@/lib/auth-api";
import { hasPermission } from "@/lib/permissions";
import { Resource, Action } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return createErrorResponse("Unauthorized", 401);

    // Allow users with USERS:READ or REPORTS:READ to list territories
    if (!hasPermission(user, Resource.USERS, Action.READ) && !hasPermission(user, Resource.REPORTS, Action.READ)) {
      return createErrorResponse("Forbidden", 403);
    }

    const territories = await prisma.territory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return createSuccessResponse({ territories });
  } catch (error: any) {
    console.error("Error fetching territories:", error);
    return createErrorResponse(error.message || "Failed to fetch territories", 500);
  }
}


