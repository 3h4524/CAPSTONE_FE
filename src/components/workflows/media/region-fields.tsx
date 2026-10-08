"use client";
import { useFormContext, useWatch } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { MockupMetadataFormValues } from "@/schemas/video-workflow";

export const RegionFields = ({ name, label }: { name: "product" | "artwork" | "detail"; label: string }) => {
  const { control, setValue } = useFormContext<MockupMetadataFormValues>();
  const value = useWatch({ control, name: `regions.${name}` });
  return <fieldset className="space-y-2 rounded-md border p-3"><div className="flex items-center justify-between gap-2"><legend className="text-xs font-medium">{label}</legend><Switch aria-label={`Mark ${label}`} checked={value !== null} onCheckedChange={checked => setValue(`regions.${name}`, checked ? { x: .2, y: .2, width: .6, height: .6 } : null, { shouldDirty: true, shouldValidate: true })} /></div>
    {value && <div className="grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map(key => <FormField key={key} control={control} name={`regions.${name}.${key}`} render={({ field }) => <FormItem><FormLabel className="text-xs">{key}</FormLabel><FormControl><Input type="number" min={0} max={1} step={.01} value={field.value} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>} />)}</div>}
  </fieldset>;
};
