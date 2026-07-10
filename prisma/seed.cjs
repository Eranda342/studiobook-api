/**
 * prisma/seed.cjs
 *
 * Idempotent development seed script for the StudioBook API.
 * Uses CommonJS so it can run directly with Node without tsx.
 *
 * Usage:
 *   npm run prisma:seed
 *   node prisma/seed.cjs
 *
 * Optional administrator account:
 *   Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env
 *   Leave both unset to seed only studio services.
 *   SEED_ADMIN_NAME is optional (defaults to Studio Admin).
 */

'use strict';

require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set. Cannot run seed.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Studio services
// ---------------------------------------------------------------------------

const STUDIO_SERVICES = [
  {
    title: 'Podcast Recording Session',
    description:
      'Professional podcast recording session with studio microphones, ' +
      'headphones, acoustic treatment, and an audio engineer.',
    duration: 60,
    price: new Prisma.Decimal('75.00'),
    isActive: true,
  },
  {
    title: 'Voice-over Recording Session',
    description:
      'Sound-treated voice-over recording session for narration, ' +
      'commercials, audiobooks, and online content.',
    duration: 90,
    price: new Prisma.Decimal('120.00'),
    isActive: true,
  },
  {
    title: 'Music Production Session',
    description:
      'Studio recording and production session for vocalists, ' +
      'instrumentalists, and music creators.',
    duration: 120,
    price: new Prisma.Decimal('200.00'),
    isActive: true,
  },
  {
    title: 'Studio Rehearsal Session',
    description:
      'Private studio rehearsal time for bands, performers, ' +
      'and recording preparation.',
    duration: 120,
    price: new Prisma.Decimal('100.00'),
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedServices() {
  console.log('\n--- Seeding studio services ---');

  for (const serviceData of STUDIO_SERVICES) {
    const existing = await prisma.service.findFirst({
      where: {
        title: { equals: serviceData.title, mode: 'insensitive' },
      },
    });

    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          description: serviceData.description,
          duration: serviceData.duration,
          price: serviceData.price,
          isActive: serviceData.isActive,
        },
      });
      console.log(`  Updated: "${serviceData.title}"`);
    } else {
      await prisma.service.create({ data: serviceData });
      console.log(`  Created: "${serviceData.title}"`);
    }
  }
}

async function seedAdmin() {
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  const emailProvided = Boolean(adminEmail && adminEmail.trim());
  const passwordProvided = Boolean(adminPassword && adminPassword.trim());

  if (!emailProvided && !passwordProvided) {
    console.log(
      '\n--- Admin seed skipped (SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD not configured) ---',
    );
    return;
  }

  // Partial configuration is a misconfiguration
  if (!emailProvided || !passwordProvided) {
    throw new Error(
      'SEED_ADMIN configuration error: ' +
        'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must both be set, ' +
        'or both must be left blank.',
    );
  }

  if (adminPassword.length < 6) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be at least 6 characters ' +
        'to meet the API registration requirements.',
    );
  }

  console.log('\n--- Seeding development administrator account ---');

  const normalizedEmail = adminEmail.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const finalName = adminName && adminName.trim() ? adminName.trim() : 'Studio Admin';

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: finalName,
      password: hashedPassword,
    },
    create: {
      name: finalName,
      email: normalizedEmail,
      password: hashedPassword,
    },
  });

  // Log the email only (never log the password or hash)
  console.log(`  Admin account ready: ${normalizedEmail} (development seed data)`);
}

async function main() {
  console.log('StudioBook API — database seed starting...');

  await seedServices();
  await seedAdmin();

  console.log('\nSeed completed successfully.\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\nDatabase seed failed:', message);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
