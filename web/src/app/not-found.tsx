import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

export default function NotFound() {
  return (
    <Container className="py-32 text-center">
      <p className="font-display text-sm text-accent">404</p>
      <h1 className="mt-4 font-display text-6xl">This box is empty.</h1>
      <p className="mt-4 text-muted">The page you’re looking for doesn’t exist.</p>
      <ButtonLink href="/boxes" className="mt-8">
        Browse boxes
      </ButtonLink>
    </Container>
  );
}
