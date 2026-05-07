import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: 'default-organization' },
    update: {},
    create: {
      name: 'Моя парковка',
      slug: 'default-organization',
      orgType: 'COMMERCIAL',
      isActive: true,
      maxLocations: 10,
      maxDevices: 50,
    },
  });

  console.log('Created organization:', org.name);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.organizationUser.upsert({
    where: { email: 'admin@parking.local' },
    update: {},
    create: {
      email: 'admin@parking.local',
      passwordHash,
      name: 'Администратор',
      role: 'OWNER',
      organizationId: org.id,
      isActive: true,
    },
  });

  console.log('Created admin user: admin@parking.local / admin123');

  // Create default location
  const location = await prisma.parkingLocation.upsert({
    where: { id: 'default-location-id' },
    update: {},
    create: {
      id: 'default-location-id',
      name: 'Главная парковка',
      address: 'ул. Центральная, д.1',
      organizationId: org.id,
      timezone: 'Europe/Moscow',
      totalSpots: 100,
      hourlyRate: 20000, // 200 руб/час в копейках
      firstFreeMinutes: 15,
      maxDailyRate: 50000, // 500 руб макс в день
      isActive: true,
    },
  });

  console.log('Created location:', location.name);

  // Create some default tariffs
  await prisma.subscription.upsert({
    where: { id: 'tariff-hourly' },
    update: {},
    create: {
      id: 'tariff-hourly',
      organizationId: org.id,
      type: 'HOURLY',
      name: 'Почасовой',
      price: 20000,
      durationDays: null,
      maxVisits: null,
      isActive: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'tariff-daily' },
    update: {},
    create: {
      id: 'tariff-daily',
      organizationId: org.id,
      type: 'DAILY',
      name: 'Дневной',
      price: 50000,
      durationDays: 1,
      maxVisits: null,
      isActive: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'tariff-monthly' },
    update: {},
    create: {
      id: 'tariff-monthly',
      organizationId: org.id,
      type: 'MONTHLY',
      name: 'Месячный',
      price: 1500000, // 15000 руб
      durationDays: 30,
      maxVisits: null,
      isActive: true,
    },
  });

  console.log('Created default tariffs');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });