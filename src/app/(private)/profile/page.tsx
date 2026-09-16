import type { Metadata } from "next";

import { Profile } from "@/components/profile/profile";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Profile",
  description: "Manage your APCS profile and preferences.",
  pathname: "/profile",
  robots: { index: false, follow: false },
});

const ProfileRoutePage = () => {
  return <Profile />;
};

export default ProfileRoutePage;
