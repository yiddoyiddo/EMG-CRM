import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity } from '@/lib/security';
import { Resource, Action } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withSecurity(Resource.USERS, Action.READ, async (context) => {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    
    // Get user's explicit permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
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

    return NextResponse.json({
      userPermissions: userPermissions.map(up => ({
        id: up.id,
        resource: up.permission.resource,
        action: up.permission.action,
        expiresAt: up.expiresAt,
        createdAt: up.createdAt
      })),
      availablePermissions: allPermissions
    });
  }, request);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withSecurity(Resource.USERS, Action.MANAGE, async (context) => {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const body = await request.json();
    const { resource, action, expiresAt } = body;

    // Find the permission
    const permission = await prisma.permission.findFirst({
      where: { resource, action }
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permissionId: permission.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: 'User already has this permission' },
        { status: 400 }
      );
    }

    // Create the permission override
    const userPermission = await prisma.userPermission.create({
      data: {
        userId,
        permissionId: permission.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: context.userId
      },
      include: {
        permission: true
      }
    });

    return NextResponse.json({
      id: userPermission.id,
      resource: userPermission.permission.resource,
      action: userPermission.permission.action,
      expiresAt: userPermission.expiresAt,
      createdAt: userPermission.createdAt
    });
  }, request);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withSecurity(Resource.USERS, Action.MANAGE, async (context) => {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permissionId');

    if (!permissionId) {
      return NextResponse.json(
        { error: 'Permission ID is required' },
        { status: 400 }
      );
    }

    // Delete the user permission
    await prisma.userPermission.deleteMany({
      where: {
        userId,
        id: permissionId
      }
    });

    return NextResponse.json({ success: true });
  }, request);
}