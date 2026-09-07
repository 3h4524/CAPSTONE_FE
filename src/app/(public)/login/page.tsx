import type { Metadata } from "next";

import { FormLogin } from "@/components/auth/form-login";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Login Page",
    description: SITE_CONFIG.description,
    pathname: "/login",
  });

const RootPage = () => {
  return (
    <>
      <main className="flex flex-col">
        <FormLogin />
      </main>
    </>
  );
};

export default RootPage;
