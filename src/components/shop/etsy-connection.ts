"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type EtsyConnectionOutcome, startEtsyConnection } from "@/api/shop";

/** postMessage type the callback page sends to the page that opened the connect popup. */
export const ETSY_CONNECTION_MESSAGE = "apcs:etsy-connection";

const outcomes: EtsyConnectionOutcome[] = ["connected", "denied", "expired", "no_shop", "shop_taken", "failed"];

const isOutcome = (value: unknown): value is EtsyConnectionOutcome =>
  typeof value === "string" && (outcomes as string[]).includes(value);

/** A centred popup sized for Etsy's sign-in and consent pages. */
const openPopup = () => {
  const width = 520;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  return window.open("about:blank", "apcs-etsy-connect", `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
};

/**
 * Connects Etsy in a popup, the way "Sign in with Google" feels: the seller never leaves the page.
 * The popup is opened inside the click (browsers block popups opened later), then pointed at Etsy's consent
 * page once the server returns it. When the popup is blocked, the whole page goes to Etsy instead and the
 * callback page forwards back, so connecting always works.
 */
export function useEtsyConnect(onOutcome: (outcome: EtsyConnectionOutcome) => void) {
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
      if (data?.type !== ETSY_CONNECTION_MESSAGE || !isOutcome(data.outcome)) return;
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
      const { authorizationUrl } = await startEtsyConnection();
      if (popup && !popup.closed) {
        popup.location.href = authorizationUrl;
        popup.focus();
        setState("waiting");
      } else {
        window.location.assign(authorizationUrl);
      }
    } catch (error) {
      popup?.close();
      popupRef.current = null;
      setState("idle");
      throw error;
    }
  }, []);

  const focusPopup = useCallback(() => popupRef.current?.focus(), []);

  return { connect, focusPopup, starting: state === "starting", waiting: state === "waiting" };
}
