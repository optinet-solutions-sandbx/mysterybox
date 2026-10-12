import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell title="Sign in" intro="Pick up where you left off: your balance, your pieces and anything on its way to you.">
      <SignInForm />
    </AuthShell>
  );
}
