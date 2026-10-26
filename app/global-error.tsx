"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Algo salió mal</h1>
          <p className="mt-2 text-sm">Ya fue reportado. Recarga la página e intenta de nuevo.</p>
        </div>
      </body>
    </html>
  );
}
