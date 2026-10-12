"use client";

import React, { useEffect, useState } from "react";
import { Activity, Calendar, Camera, Loader2, Mail, ShieldAlert, ShieldCheck, UserCircle2, Zap } from "lucide-react";
import { toast } from "sonner";

import { sendResetPasswordLink, updateAdminUser } from "@/api/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminUserDto, UpdateAdminUserRequest } from "@/types/admin";
import { cn } from "@/utils/cn";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EditUserModalProps {
  user: AdminUserDto | null;
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  { id: "Admin", label: "Admin" },
  { id: "Seller", label: "Seller" },
];

export const EditUserModal = ({ user, isOpen, onClose }: EditUserModalProps) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<UpdateAdminUserRequest>({
    fullName: "",
    email: "",
    birthday: null,
    avatarUrl: null,
    accountStatus: "active",
    roles: [],
  });

  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        birthday: user.birthday ? user.birthday.split("T")[0] : null,
        avatarUrl: user.avatarUrl,
        accountStatus: user.accountStatus.toLowerCase(),
        roles: user.roles.length > 0 ? [user.roles[0]] : [],
      });
      setIsEditingAvatar(false);
    }
  }, [user, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAdminUserRequest) => updateAdminUser(user!.id, data),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { title?: string } } };
      toast.error(err?.response?.data?.title || "Failed to update user");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => sendResetPasswordLink(user!.id),
    onSuccess: () => {
      toast.success("Reset password link sent to user's email");
    },
    onError: () => {
      toast.error("Failed to send reset password link");
    },
  });

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (roleId: string) => {
    setFormData((prev) => ({ ...prev, roles: [roleId] }));
  };

  const handleSave = () => {
    if (!formData.fullName || !formData.email) {
      toast.error("Full Name and Email are required");
      return;
    }

    if (formData.birthday) {
      const selectedDate = new Date(formData.birthday);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate >= today) {
        toast.error("Birthday must be in the past");
        return;
      }
    }

    const submitData = {
      ...formData,
      birthday: formData.birthday || null,
      accountStatus: formData.accountStatus.charAt(0).toUpperCase() + formData.accountStatus.slice(1)
    };

    updateMutation.mutate(submitData);
  };

  const activeRole = formData.roles[0] || "";
  const isSeller = activeRole.toLowerCase() === "seller";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[480px] overflow-y-auto rounded-[24px] border border-slate-200/50 bg-slate-50 p-0 shadow-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:hidden">
        <div className="relative p-8 pb-6">
          
          {/* Header & Avatar: Matching View Detail exactly */}
          <div className="flex flex-col items-center text-center">
            <div className="group relative cursor-pointer">
              <div className="flex size-24 items-center justify-center rounded-full border border-slate-100 bg-white p-1.5 shadow-sm">
                <Avatar className="h-full w-full">
                  <AvatarImage src={formData.avatarUrl || ""} alt={formData.fullName} className="rounded-full object-cover" />
                  <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-3xl font-bold text-white">
                    {formData.fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Overlay Edit Button */}
              <div
                className="absolute inset-0 m-1.5 flex items-center justify-center rounded-full bg-black/50 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100"
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              >
                <Camera className="size-6 text-white drop-shadow-md" />
              </div>
            </div>

            <DialogTitle className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              Edit User Profile
            </DialogTitle>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Update information and access settings
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5">

            {/* Avatar URL Edit Field */}
            {isEditingAvatar && (
              <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Camera className="size-4 text-slate-400" />
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Avatar URL</span>
                </div>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  value={formData.avatarUrl || ""}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="h-9 border-slate-200 text-sm focus-visible:ring-slate-400"
                />
              </div>
            )}

            {/* General Info Block */}
            <div className="space-y-4 rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <UserCircle2 className="size-4 text-slate-400" />
                  <Label htmlFor="fullName" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Full Name</Label>
                </div>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="h-10 border-slate-200 text-sm focus-visible:ring-slate-400"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Mail className="size-4 text-slate-400" />
                  <Label htmlFor="email" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Email</Label>
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-10 border-slate-200 text-sm focus-visible:ring-slate-400"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="size-4 text-slate-400" />
                  <Label htmlFor="birthday" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Birthday</Label>
                </div>
                <Input
                  id="birthday"
                  name="birthday"
                  type="date"
                  max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
                  value={formData.birthday || ""}
                  onChange={handleChange}
                  className="h-10 border-slate-200 text-sm focus-visible:ring-slate-400"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="size-4 text-slate-400" />
                  <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Status</Label>
                </div>
                <Select
                  value={formData.accountStatus}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, accountStatus: val }))}
                >
                  <SelectTrigger className="h-10 w-full border-slate-200 text-sm focus:ring-slate-400">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-sm font-semibold">Active</SelectItem>
                    <SelectItem value="pending_verification" className="text-sm font-semibold">Pending</SelectItem>
                    <SelectItem value="suspended" className="text-sm font-semibold text-rose-600">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role Block */}
            <div className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="size-4 text-slate-400" />
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Role</Label>
              </div>
              <div className="flex gap-2">
                {ROLES.map((role) => {
                  const isSelected = activeRole.toLowerCase() === role.id.toLowerCase();
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleSelect(role.id)}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-center text-sm font-semibold transition-all duration-200 ease-out",
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seller Info Block */}
            {isSeller && (
              <div className="flex items-center justify-between rounded-2xl border border-indigo-100/60 bg-indigo-50/30 p-4 shadow-sm transition-shadow hover:shadow-md">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Zap className="size-4 text-indigo-500" />
                    <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">Current Plan</span>
                  </div>
                  <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-700 uppercase">{user.plan}</span>
                </div>
                <div className="h-10 w-px bg-indigo-100"></div>
                <div className="text-right">
                  <div className="mb-1 flex items-center justify-end gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">API Cost / Mo</span>
                  </div>
                  <span className="text-lg font-bold text-indigo-900">${user.monthlyApiCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Password Reset Block */}
            <div className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-4 text-slate-400" />
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Password</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg leading-none text-slate-400">••••••••</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-slate-200 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => resetPasswordMutation.mutate()}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <Loader2 className="mr-2 size-3 animate-spin text-slate-500" />
                  ) : (
                    <Mail className="mr-1.5 size-3 text-slate-500" />
                  )}
                  Reset Password
                </Button>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              className="h-11 flex-1 rounded-xl bg-slate-900 font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
