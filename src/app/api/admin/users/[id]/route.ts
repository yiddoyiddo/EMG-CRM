import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { Role } from "@prisma/client";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["ADMIN", "DIRECTOR", "MANAGER", "TEAM_LEAD", "BDR"]).optional(),
  isActive: z.boolean().optional(),
  territoryId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Users can only view their own profile unless they're admin
    if (session.user.role !== "ADMIN" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            pipelineItems: true,
            leads: true,
            activityLogs: true,
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Users can only edit their own profile unless they're admin
    // Admins can edit anyone, but regular users can only edit themselves
    if (session.user.role !== "ADMIN" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If email is being updated, check for conflicts
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailConflict) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    // If non-admin tries to change role, prevent it
    if (validatedData.role && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can change user roles" }, { status: 403 });
    }

    // Prepare update data
    const updateData: Record<string, any> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.role !== undefined) updateData.role = validatedData.role as Role;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.territoryId !== undefined) updateData.territoryId = validatedData.territoryId;
    
    // Hash password if provided
    if (validatedData.password) {
      updateData.hashedPassword = await hashPassword(validatedData.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (session.user.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pipelineItems: true,
            leads: true,
            activityLogs: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has associated data
    if (user._count.pipelineItems > 0 || user._count.leads > 0 || user._count.activityLogs > 0) {
      return NextResponse.json({ 
        error: "Cannot delete user with associated data. Please reassign their data first.",
        details: {
          pipelineItems: user._count.pipelineItems,
          leads: user._count.leads,
          activityLogs: user._count.activityLogs,
        }
      }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}