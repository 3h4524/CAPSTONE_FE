"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type PinterestConnectionOutcome, startPinterestConnection } from "@/api/social";

/** postMessage type the callback page sends to the page that opened the connect popup. */
export const PINTEREST_CONNECTION_MESSAGE = "apcs:pinterest-connection";

/** Where a seller sent to Pinterest without a popup (it was blocked) comes back to. */
export const PINTEREST_RETURN_KEY = "apcs:pinterest-return";

const outcomes: PinterestConnectionOutcome[] = ["connected", "denied", "expired", "failed"];

export const isPinterestOutcome = (value: unknown): value is PinterestConnectionOutcome =>
  typeof value === "string" && (outcomes as string[]).includes(value);

/** What each outcome means for the seller, and whether it is a failure. */
export const PINTEREST_OUTCOME_MESSAGES: Record<PinterestConnectionOutcome, { text: string; failed: boolean }> = {
  connected: { text: "Pinterest is connected. Choose the board the pins go to.", failed: false },
  denied: { text: "Pinterest was not connected: access was declined.", failed: true },
  expired: { text: "The Pinterest connection took too long. Try again.", failed: true },
  failed: { text: "Pinterest could not be connected. Try again in a moment.", failed: true },
};

/** A centred popup sized for Pinterest's sign-in and consent pages. */
const openPopup = () => {
  const width = 520;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  return window.open("about:blank", "apcs-pinterest-connect", `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
};

/**
 * Connects Pinterest in a popup, so the seller never leaves the workflow. The popup is opened inside the click
 * (browsers block popups opened later), then pointed at Pinterest's consent page once the server returns it. When the
 * popup is blocked, the whole page goes to Pinterest and the callback page comes back to this page.
 */
export function usePinterestConnect(onOutcome: (outcome: PinterestConnectionOutcome) => void) {
  const [state, setState] = useState<"idle" | "starting" | "waiting">("idle");
  const popupRef = useRef<Window | null>(null);
  const onOutcomeRef = useRef(onOutcome);

  useEffect(() => {
    onOutcomeRef.current = onOutcome;
  }, [onOutcome]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown; outcome?: unknown } | null;
      if (data?.type !== PINTEREST_CONNECTION_MESSAGE || !isPinterestOutcome(data.outcome)) return;
      popupRef.current = null;
      setState("idle");
      onOutcomeRef.current(data.outcome);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // A popup closed by the seller before finishing sends no message: stop waiting.
  useEffect(() => {
    if (state !== "waiting") return;
    const timer = window.setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setState("idle");
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [state]);

  const connect = useCallback(async () => {
    const popup = openPopup();
    popupRef.current = popup;
    setState("starting");
    try {
      const { authorizationUrl } = await startPinterestConnection();
      if (popup && !popup.closed) {
        popup.location.href = authorizationUrl;
        popup.focus();
        setState("waiting");
      } else {
        try {
          window.sessionStorage.setItem(PINTEREST_RETURN_KEY, `${window.location.pathname}${window.location.search}`);
        } catch {
          // Without storage the callback page falls back to the workflows list.
        }
        window.location.assign(authorizationUrl);
      }
    } catch (error) {
      popup?.close();
      popupRef.current = null;
      setState("idle");
      throw error;
    }
  }, []);

  return { connect, starting: state === "starting", waiting: state === "waiting" };
}
