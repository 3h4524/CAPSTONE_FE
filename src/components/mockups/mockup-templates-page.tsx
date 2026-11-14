"use client";

import { ImageIcon, UserRound } from "lucide-react";

import { MockupTemplatesPanel } from "@/components/mockups/mockup-templates-panel";
import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const MockupTemplatesPage = () => (
  <div className="flex w-full min-w-0 flex-col gap-6 max-md:gap-3 md:p-6">
    <div>
      <h1 className="text-ink-900 text-xl font-semibold">Mock-up Templates</h1>
      <p className="text-muted-foreground mt-1 text-sm max-md:hidden">Browse system mock-ups, manage the product photos you uploaded, and the photos of people your mock-ups are put on.</p>
    </div>
    <Tabs defaultValue="templates" className="gap-5 max-md:gap-3">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="templates" className="px-4">
          <ImageIcon aria-hidden="true" />
          Product photos
        </TabsTrigger>
        <TabsTrigger value="models" className="px-4">
          <UserRound aria-hidden="true" />
          Model photos
        </TabsTrigger>
      </TabsList>
      <TabsContent value="templates">
        <MockupTemplatesPanel scope="seller" />
      </TabsContent>
      <TabsContent value="models">
        <ModelPhotosPanel scope="seller" />
      </TabsContent>
    </Tabs>
  </div>
);
