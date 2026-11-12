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
      <DialogContent className={cn("border-ink-200/50 bg-ink-50 max-h-[90vh] max-w-[480px] overflow-y-auto rounded-[24px] border p-0 shadow-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:hidden", USER_DIALOG_ON_PHONE)}>
        <div className="relative p-8 pb-6 max-md:p-5 max-md:pb-0">
          <div className="flex flex-col items-center text-center">
            <div className="border-ink-100 bg-card flex size-24 items-center justify-center rounded-full border p-1.5 shadow-sm max-md:size-16">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
                <ShieldAlert className="size-10 text-white" />
              </div>
            </div>

            <DialogTitle className="text-ink-900 mt-5 text-2xl font-bold tracking-tight max-md:mt-3 max-md:text-xl">
              Suspend User Account
            </DialogTitle>
            <p className="text-ink-500 mt-1 text-sm font-medium">
              You are about to suspend <span className="text-ink-800 font-bold">{user.fullName}</span> ({user.email}).
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5 max-md:mt-5 max-md:gap-3">
            <div className="border-ink-200 bg-ink-100/60 text-ink-700 rounded-xl border p-3 text-sm">
              <div className="flex gap-2">
                <AlertTriangle className="text-ink-600 size-5 shrink-0" />
                <p>
                  Suspending this account will immediately revoke all active sessions. The user will not be able to log in until the suspension period ends.
                </p>
              </div>
            </div>

            <div className="border-ink-100/60 bg-card space-y-4 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <Label className="text-ink-400 mb-2 block text-[10px] font-bold tracking-wider uppercase">Suspension Reason</Label>
                <Textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly explain the reason for suspension (required)"
                  className="border-ink-200 focus-visible:ring-ink-400 resize-none text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="border-ink-100/60 bg-card space-y-4 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <Label className="text-ink-400 mb-3 block text-[10px] font-bold tracking-wider uppercase">Suspension Duration</Label>
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
              className="border-ink-200 text-ink-700 hover:bg-ink-50 hover:text-ink-900 h-11 flex-1 rounded-xl font-semibold shadow-sm" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="bg-ink-900 text-card hover:bg-ink-800 h-11 flex-1 gap-2 rounded-xl font-semibold shadow-sm transition-all"
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
