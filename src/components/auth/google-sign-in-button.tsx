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
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
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

type GoogleSignInButtonProps = {
  text: "signin_with" | "signup_with";
  clientId: string;
};

export const GoogleSignInButton = ({ text, clientId }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mutate: googleLogin } = useGoogleLogin();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => googleLogin(response.credential),
        });

        window.google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text,
          width: container.offsetWidth,
        });
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, googleLogin, text]);

  return <div ref={containerRef} className="flex w-full justify-center" />;
};
