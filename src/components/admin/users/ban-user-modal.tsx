import React, { useState } from "react";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";

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
import { toast } from "sonner";

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
      <DialogContent className="max-h-[90vh] max-w-[480px] [scrollbar-width:none] overflow-y-auto rounded-[24px] border border-slate-200/50 bg-slate-50 p-0 shadow-2xl [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>button]:hidden">
        <div className="relative p-8 pb-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-24 items-center justify-center rounded-full border border-slate-100 bg-white p-1.5 shadow-sm">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-rose-50">
                <ShieldAlert className="size-10 text-rose-600" />
              </div>
            </div>

            <DialogTitle className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              Suspend User Account
            </DialogTitle>
            <p className="mt-1 text-sm font-medium text-slate-500">
              You are about to suspend <span className="font-bold text-slate-800">{user.fullName}</span> ({user.email}).
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5">
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-sm text-rose-800">
              <div className="flex gap-2">
                <AlertTriangle className="size-5 shrink-0 text-rose-600" />
                <p>
                  Suspending this account will immediately revoke all active sessions. The user will not be able to log in until the suspension period ends.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm">
              <div>
                <Label className="mb-2 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">Suspension Reason</Label>
                <Textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly explain the reason for suspension (required)"
                  className="resize-none border-slate-200 text-sm focus-visible:ring-rose-400"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm">
              <div>
                <Label className="mb-3 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">Suspension Duration</Label>
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
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-slate-50",
                        selectedDuration === option.value ? "border-rose-200 bg-rose-50/50" : "border-slate-100"
                      )}
                    >
                      <RadioGroupItem value={option.value} id={`ban-${option.value}`} className="mt-0.5 text-rose-600 focus:ring-rose-600" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                        <span className="text-xs text-slate-500">{option.description}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm} 
              disabled={isLoading}
              className="flex-1 gap-2 rounded-xl bg-rose-600 hover:bg-rose-700"
            >
              <Clock className="size-4" />
              {isLoading ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
