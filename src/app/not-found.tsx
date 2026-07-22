import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-heading text-6xl font-bold text-gradient">404</p>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-ink">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted">
        Sorry, the page you were looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
      >
        Back to home
      </Link>
    </Container>
  );
}
