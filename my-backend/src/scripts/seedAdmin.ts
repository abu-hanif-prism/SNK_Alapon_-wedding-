import { env } from "../config/env";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";

// Creates the first ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD. Safe to re-run: it never overwrites.
async function main() {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin already exists: ${email} (role ${existing.role}). Nothing changed.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: env.ADMIN_NAME,
      email,
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      role: "ADMIN",
    },
  });

  console.log(`Admin created: ${email}`);
}

main()
  .catch((error) => {
    console.error("Seeding admin failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
