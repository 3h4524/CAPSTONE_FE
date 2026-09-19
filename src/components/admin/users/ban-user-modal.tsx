import React, { useState } from "react";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AdminUserDto } from "@/types/admin";
import { cn } from "@/utils/cn";

interface BanUserModalProps {
  user: AdminUserDto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationDays: number | null) => void;
  isLoading?: boolean;
}

const banOptions = [
  { value: "1", label: "1 Day", description: "Temporary suspension for minor violations" },
  { value: "7", label: "7 Days", description: "Standard suspension for repeated offenses" },
  { value: "30", label: "1 Month", description: "Long-term suspension for severe violations" },
  { value: "permanent", label: "Permanent", description: "Indefinite ban from the platform" },
];

export const BanUserModal = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: BanUserModalProps) => {
  const [selectedDuration, setSelectedDuration] = useState<string>("7");

  if (!user) return null;

  const handleConfirm = () => {
    const durationDays = selectedDuration === "permanent" ? null : parseInt(selectedDuration, 10);
    onConfirm(durationDays);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-rose-100">
            <ShieldAlert className="size-6 text-rose-600" />
          </div>
          <DialogTitle className="text-center text-xl">Suspend User Account</DialogTitle>
          <DialogDescription className="text-center">
            You are about to suspend <span className="font-semibold text-slate-900">{user.fullName}</span> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="size-5 shrink-0 text-amber-600" />
              <p>
                Suspending this account will immediately revoke all active sessions. The user will not be able to log in until the suspension period ends.
              </p>
            </div>
          </div>

          <Label className="mb-3 block text-sm font-medium">Select Suspension Duration</Label>
          <RadioGroup 
            value={selectedDuration} 
            onValueChange={setSelectedDuration}
            className="flex flex-col gap-3"
          >
            {banOptions.map((option) => (
              <Label
                key={option.value}
                htmlFor={`ban-${option.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50",
                  selectedDuration === option.value ? "border-rose-200 bg-rose-50" : "border-slate-200"
                )}
              >
                <RadioGroupItem value={option.value} id={`ban-${option.value}`} className="mt-0.5 text-rose-600 focus:ring-rose-600" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium leading-none">{option.label}</span>
                  <span className="text-xs text-slate-500">{option.description}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isLoading}
            className="gap-2"
          >
            <Clock className="size-4" />
            {isLoading ? "Suspending..." : "Confirm Suspension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
