"use client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { GoogleIcon } from "./google-icon";
import { GoogleSignInButton } from "./google-sign-in-button";

type AuthSocialDividerProps = {
  mode: "signin" | "signup";
  onTwoFactorRequired?: (tempToken: string, expiresAtUtc: string) => void;
};

const LABEL_KEYS = {
  signin: "auth.signInWithGoogle",
  signup: "auth.signUpWithGoogle",
} as const;

export const AuthSocialDivider = ({ mode, onTwoFactorRequired }: AuthSocialDividerProps) => {
  const { t } = useTranslation("common");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs uppercase">{t("auth.or")}</span>
        <Separator className="flex-1" />
      </div>

      {clientId ? (
        <GoogleSignInButton
          clientId={clientId}
          text={mode === "signup" ? "signup_with" : "signin_with"}
          onTwoFactorRequired={onTwoFactorRequired}
        />
      ) : (
        // No client ID configured for this environment, so the flow cannot work: the button
        // stays visible but inert rather than failing when clicked.
        <Button type="button" variant="outline" className="w-full" disabled>
          <GoogleIcon className="size-4" />
          {t(LABEL_KEYS[mode])}
        </Button>
      )}
    </div>
  );
};
