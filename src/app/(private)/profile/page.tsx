import type { Metadata } from "next";

import { Profile } from "@/components/profile/profile";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your APCS profile and preferences.",
};

const ProfileRoutePage = () => {
  return <Profile />;
};

export default ProfileRoutePage;
