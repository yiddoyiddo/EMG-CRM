import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity } from '@/lib/security';
import { Resource, Action, Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  return withSecurity(Resource.SETTINGS, Action.MANAGE, async (context) => {
    // Get all current role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true
      }
    });

    // Get all available permissions
    const allPermissions = await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    // Group permissions by role
    const permissionsByRole = rolePermissions.reduce((acc, rp) => {
      const role = rp.role;
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description
      });
      return acc;
    }, {} as Record<Role, any[]>);

    return NextResponse.json({
      rolePermissions: permissionsByRole,
      availablePermissions: allPermissions.map(p => ({
        id: p.id,
        name: p.name,
        resource: p.resource,
        action: p.action,
        description: p.description
      }))
    });
  }, request);
}

export async function POST(request: NextRequest) {
  return withSecurity(Resource.SETTINGS, Action.MANAGE, async (context) => {
    const body = await request.json();
    const { role, permissionId } = body;

    if (!role || !permissionId) {
      return NextResponse.json(
        { error: 'Role and permission ID are required' },
        { status: 400 }
      );
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Check if role permission already exists
    const existingRolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: role as Role,
        permissionId
      }
    });

    if (existingRolePermission) {
      return NextResponse.json(
        { error: 'Role already has this permission' },
        { status: 400 }
      );
    }

    // Create the role permission
    const rolePermission = await prisma.rolePermission.create({
      data: {
        role: role as Role,
        permissionId
      },
      include: {
        permission: true
      }
    });

    return NextResponse.json({
      id: rolePermission.permission.id,
      name: rolePermission.permission.name,
      resource: rolePermission.permission.resource,
      action: rolePermission.permission.action,
      description: rolePermission.permission.description
    });
  }, request);
}

export async function DELETE(request: NextRequest) {
  return withSecurity(Resource.SETTINGS, Action.MANAGE, async (context) => {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const permissionId = searchParams.get('permissionId');

    if (!role || !permissionId) {
      return NextResponse.json(
        { error: 'Role and permission ID are required' },
        { status: 400 }
      );
    }

    // Delete the role permission
    await prisma.rolePermission.deleteMany({
      where: {
        role: role as Role,
        permissionId
      }
    });

    return NextResponse.json({ success: true });
  }, request);
}

// Bulk update endpoint for better UX
export async function PATCH(request: NextRequest) {
  return withSecurity(Resource.SETTINGS, Action.MANAGE, async (context) => {
    const body = await request.json();
    const { role, permissionIds } = body;

    if (!role || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'Role and permission IDs array are required' },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Remove all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { role: role as Role }
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            role: role as Role,
            permissionId
          }))
        });
      }
    });

    return NextResponse.json({ success: true });
  }, request);
}