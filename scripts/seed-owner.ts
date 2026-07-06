import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { owners } = await import("../lib/db/schema");
  const { hashPassword } = await import("../lib/auth/password");
  const { eq } = await import("drizzle-orm");

  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;

  if (!email || !password) {
    throw new Error("OWNER_EMAIL and OWNER_PASSWORD must be set in .env.local");
  }

  const existing = await db.query.owners.findFirst({
    where: eq(owners.email, email),
  });

  const passwordHash = await hashPassword(password);

  if (existing) {
    await db
      .update(owners)
      .set({ passwordHash })
      .where(eq(owners.id, existing.id));
    console.log(`Updated password for existing owner ${email}`);
  } else {
    await db.insert(owners).values({ email, passwordHash });
    console.log(`Created owner ${email}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
