import { PrismaClient, Resource, Action } from '@prisma/client';

const prisma = new PrismaClient();

async function populatePermissions() {
  console.log('Populating permissions...');

  const resources = Object.values(Resource);
  const actions = Object.values(Action);

  for (const resource of resources) {
    for (const action of actions) {
      // Create permission if it doesn't exist
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource,
            action
          }
        },
        update: {},
        create: {
          name: `${resource}_${action}`,
          resource,
          action,
          description: `${action} permission for ${resource}`
        }
      });
    }
  }

  console.log('✅ Permissions populated successfully');
}

populatePermissions()
  .catch((e) => {
    console.error('❌ Error populating permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });