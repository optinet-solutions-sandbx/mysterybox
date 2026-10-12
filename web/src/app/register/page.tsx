import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <AuthShell title="Register" intro="One account holds your demo balance, the pieces you open and where to ship them.">
      <RegisterForm />
    </AuthShell>
  );
}
