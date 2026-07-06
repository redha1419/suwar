"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { owners } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const owner = await db.query.owners.findFirst({
    where: eq(owners.email, email),
  });

  if (!owner || !(await verifyPassword(password, owner.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  const session = await getSession();
  session.ownerId = owner.id;
  session.email = owner.email;
  await session.save();

  redirect("/library");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
