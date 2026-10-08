import { prisma } from "./lib/prisma";

async function main() {
  const userCount = await prisma.user.count();
  console.log("Database connected. Total users:", userCount);
}

main()
  .catch((error) => {
    console.error("Database test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });