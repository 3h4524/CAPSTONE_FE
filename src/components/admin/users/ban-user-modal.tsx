import React, { useState } from "react";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { USER_DIALOG_FOOTER_ON_PHONE,USER_DIALOG_ON_PHONE } from "@/components/admin/users/admin-user-parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUserDto } from "@/types/admin";
import { cn } from "@/utils/cn";



interface BanUserModalProps {
  user: AdminUserDto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationDays: number | null, reason: string) => void;
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
  const [reason, setReason] = useState("");

  if (!user) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }
    const durationDays = selectedDuration === "permanent" ? null : parseInt(selectedDuration, 10);
    onConfirm(durationDays, reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("max-h-[90vh] max-w-[480px] overflow-y-auto rounded-[24px] border border-ink-200/50 bg-ink-50 p-0 shadow-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:hidden", USER_DIALOG_ON_PHONE)}>
        <div className="relative p-8 pb-6 max-md:p-5 max-md:pb-0">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-24 items-center justify-center rounded-full border border-ink-100 bg-card p-1.5 shadow-sm max-md:size-16">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
                <ShieldAlert className="size-10 text-white" />
              </div>
            </div>

            <DialogTitle className="mt-5 text-2xl font-bold tracking-tight text-ink-900 max-md:mt-3 max-md:text-xl">
              Suspend User Account
            </DialogTitle>
            <p className="mt-1 text-sm font-medium text-ink-500">
              You are about to suspend <span className="font-bold text-ink-800">{user.fullName}</span> ({user.email}).
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5 max-md:mt-5 max-md:gap-3">
            <div className="rounded-xl border border-ink-200 bg-ink-100/60 p-3 text-sm text-ink-700">
              <div className="flex gap-2">
                <AlertTriangle className="size-5 shrink-0 text-ink-600" />
                <p>
                  Suspending this account will immediately revoke all active sessions. The user will not be able to log in until the suspension period ends.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-ink-100/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <Label className="mb-2 block text-[10px] font-bold tracking-wider text-ink-400 uppercase">Suspension Reason</Label>
                <Textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly explain the reason for suspension (required)"
                  className="resize-none border-ink-200 text-sm focus-visible:ring-ink-400"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-ink-100/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <Label className="mb-3 block text-[10px] font-bold tracking-wider text-ink-400 uppercase">Suspension Duration</Label>
                <RadioGroup 
                  value={selectedDuration} 
                  onValueChange={setSelectedDuration}
                  className="flex flex-col gap-2"
                >
                  {banOptions.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`ban-${option.value}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                        selectedDuration === option.value 
                          ? "border-ink-900 bg-ink-900 text-card shadow-sm" 
                          : "border-ink-200 bg-card text-ink-600 hover:bg-ink-50"
                      )}
                    >
                      <RadioGroupItem 
                        value={option.value} 
                        id={`ban-${option.value}`} 
                        className={cn(
                          "mt-0.5", 
                          selectedDuration === option.value ? "border-card text-white" : "text-ink-900"
                        )} 
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className={cn("text-xs", selectedDuration === option.value ? "text-ink-300" : "text-ink-500")}>
                          {option.description}
                        </span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className={cn("mt-8 flex gap-3", USER_DIALOG_FOOTER_ON_PHONE)}>
            <Button 
              variant="outline" 
              className="h-11 flex-1 rounded-xl border-ink-200 font-semibold text-ink-700 shadow-sm hover:bg-ink-50 hover:text-ink-900" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="h-11 flex-1 gap-2 rounded-xl bg-ink-900 font-semibold text-card shadow-sm transition-all hover:bg-ink-800"
              onClick={handleConfirm} 
              disabled={isLoading}
              aria-label={isLoading ? undefined : "Confirm Suspension"}
            >
              <Clock className="size-4" />
              {isLoading ? "Suspending..." : <span>Confirm<span className="max-md:hidden"> Suspension</span></span>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
