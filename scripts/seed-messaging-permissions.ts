import { prisma } from '@/lib/db';
import { Action, Resource, Role } from '@prisma/client';

async function main() {
  const defs: Array<{ action: Action }> = [
    { action: Action.READ },
    { action: Action.CREATE },
    { action: Action.UPDATE },
    { action: Action.DELETE },
    { action: Action.MANAGE },
  ];

  for (const d of defs) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: Resource.MESSAGING, action: d.action } },
      update: {},
      create: {
        name: `Messaging ${d.action}`,
        resource: Resource.MESSAGING,
        action: d.action,
        description: `Permission to ${d.action} messaging resources`,
      },
    });
  }

  const perms = await prisma.permission.findMany({ where: { resource: Resource.MESSAGING } });
  const byAction = Object.fromEntries(perms.map((p) => [p.action, p]));

  // Grant defaults
  const grantRole = async (role: Role, actions: Action[]) => {
    for (const a of actions) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: byAction[a].id } },
        update: {},
        create: { role, permissionId: byAction[a].id },
      });
    }
  };

  await grantRole(Role.BDR, [Action.READ, Action.CREATE, Action.UPDATE]);
  await grantRole(Role.TEAM_LEAD, [Action.READ, Action.CREATE, Action.UPDATE]);
  await grantRole(Role.MANAGER, [Action.READ, Action.CREATE, Action.UPDATE, Action.MANAGE]);
  await grantRole(Role.DIRECTOR, [Action.READ, Action.MANAGE]);
  await grantRole(Role.ADMIN, [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.MANAGE]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});


