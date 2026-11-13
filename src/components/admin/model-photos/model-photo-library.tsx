"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";

export const ModelPhotoLibrary = () => (
  <AdminShell>
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h2 className="font-display text-ink-900 text-xl font-bold tracking-tight sm:text-2xl">
          Model photo library
        </h2>
        <p className="text-ink-600 max-w-3xl text-sm leading-relaxed">
          Sellers put a mock-up on one of these photos in their video workflow. The person’s garment
          is recolored to the mock-up’s color and the design is printed where it sits on the
          mock-up, without AI.
        </p>
      </header>
      <ModelPhotosPanel scope="admin" />
    </div>
  </AdminShell>
);
