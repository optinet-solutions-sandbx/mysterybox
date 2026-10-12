import type { Metadata } from "next";
import { AccountView } from "@/components/account/account-view";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Account" intro="Your details, how we contact you, and what’s coming once accounts are real." />
      <Container className="py-10">
        <AccountView />
      </Container>
    </>
  );
}
