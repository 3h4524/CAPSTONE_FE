"use client";

import { useEffect, useRef } from "react";

import { useGoogleLogin } from "@/hooks/mutations/use-google-login";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoadPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

// Google draws its button at a fixed width, between these two.
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

type GoogleSignInButtonProps = {
  text: "signin_with" | "signup_with";
  clientId: string;
  onTwoFactorRequired?: (tempToken: string, expiresAtUtc: string) => void;
};

export const GoogleSignInButton = ({
  text,
  clientId,
  onTwoFactorRequired,
}: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mutate: googleLogin } = useGoogleLogin(onTwoFactorRequired);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let drawnWidth = 0;

    // The width is fixed once drawn, so a narrower screen or a turned phone needs a new button.
    const draw = () => {
      const width = Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, container.clientWidth));
      if (width === drawnWidth || !window.google) return;
      drawnWidth = width;
      container.replaceChildren();
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text,
        width,
      });
    };

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => googleLogin(response.credential),
        });

        draw();
        observer = new ResizeObserver(draw);
        observer.observe(container);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [clientId, googleLogin, text]);

  return <div ref={containerRef} className="flex w-full min-w-0 justify-center overflow-hidden" />;
};
