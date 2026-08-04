"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/actions/auth-actions";

/**
 * Catches any render-time error anywhere under the protected app shell
 * (stale cached session, a transient DB error that slipped past
 * getCurrentUser, etc.) and signs the user out instead of leaving them on
 * Next.js's generic error page. Logging back in gets them a fresh session.
 */
export default function ProtectedError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.error("Protected app failed to render; signing out.", error);
    formRef.current?.requestSubmit();
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          Refreshing your session
        </h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong loading this page. You&apos;re being signed
          out — please log in again.
        </p>
        <form ref={formRef} action={logout}>
          <button
            type="submit"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Click here if you&apos;re not redirected automatically
          </button>
        </form>
      </div>
    </div>
  );
}
