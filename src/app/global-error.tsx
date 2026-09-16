"use client";

import { useEffect } from "react";

import { Log } from "@/helpers/log";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

// eslint-disable-next-line import/no-default-export
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Log.error({ prefix: "app/global-error", message: error.message, data: error });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try again, or come back later.</p>
          <button onClick={reset} style={{ cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
