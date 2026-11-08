"use client";

import { Copy, Edit2, Eye, MoreHorizontal, ShieldAlert, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUserDto } from "@/types/admin";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

export type AdminUserActions = {
  onView: (user: AdminUserDto) => void;
  onEdit: (user: AdminUserDto) => void;
  onSuspend: (user: AdminUserDto) => void;
  onUnlock: (user: AdminUserDto) => void;
  onCopyId: (id: string) => void;
};

// The dialogs set their own width, so a phone needs its margins back; the column must also be
// free to shrink, or a row of buttons that cannot wrap pushes the dialog past the screen.
export const USER_DIALOG_ON_PHONE =
  "max-md:max-w-[calc(100%-1.5rem)] max-md:grid-cols-[minmax(0,1fr)] max-md:overflow-y-auto max-md:rounded-2xl";

// Keeps a long form's actions on screen while it scrolls under them.
export const USER_DIALOG_FOOTER_ON_PHONE =
  "max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-5 max-md:mt-4 max-md:border-t max-md:bg-slate-50 max-md:px-5 max-md:py-3";

// The pieces of a user, shared by the desktop table's row and the phone's card.

export const UserRoles = ({ user }: { user: AdminUserDto }) => (
  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <span 
                          key={role} 
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                            (role.toLowerCase() === "admin" || role.toLowerCase() === "super admin") && "border-rose-200 bg-rose-50 text-rose-700",
                            role.toLowerCase() === "seller" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            role.toLowerCase() === "user" && "border-slate-200 bg-slate-50 text-slate-700",
                            !["admin", "super admin", "seller", "user"].includes(role.toLowerCase()) && "border-slate-200 bg-slate-50 text-slate-700"
                          )}
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                        User
                      </span>
                    )}
                  </div>
);

export const UserPlan = ({ user }: { user: AdminUserDto }) => (
  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                      user.plan.toLowerCase() === "free" && "border-slate-200 bg-slate-50 text-slate-600",
                      user.plan.toLowerCase() === "starter" && "border-sky-200 bg-sky-50 text-sky-700",
                      user.plan.toLowerCase() === "creator" && "border-indigo-200 bg-indigo-50 text-indigo-700",
                      user.plan.toLowerCase() === "studio" && "border-violet-200 bg-violet-50 text-violet-700"
                    )}
                  >
                    {user.plan}
                  </span>
);

export const UserStatus = ({ user }: { user: AdminUserDto }) => (
  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      user.accountStatus.toLowerCase() === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      user.accountStatus.toLowerCase() === "pending_verification" && "border-amber-200 bg-amber-50 text-amber-700",
                      user.accountStatus.toLowerCase() === "suspended" && "border-rose-200 bg-rose-50 text-rose-700"
                    )}
                  >
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      user.accountStatus.toLowerCase() === "active" && "bg-emerald-500",
                      user.accountStatus.toLowerCase() === "pending_verification" && "bg-amber-500",
                      user.accountStatus.toLowerCase() === "suspended" && "bg-rose-500"
                    )} />
                    {user.accountStatus.toLowerCase() === "pending_verification" ? "Pending" : user.accountStatus}
                  </span>
);

export const UserActions = ({ user, onView, onEdit, onSuspend, onUnlock, onCopyId }: AdminUserActions & { user: AdminUserDto }) => (
  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 max-md:size-10">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onCopyId(user.id)} className="cursor-pointer">
                        <Copy className="mr-2 h-4 w-4 text-slate-400" />
                        Copy User ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onView(user)} className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4 text-slate-400" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)} className="cursor-pointer">
                        <Edit2 className="mr-2 h-4 w-4 text-slate-400" />
                        Edit user
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.accountStatus.toLowerCase() === "suspended" ? (
                        <DropdownMenuItem onClick={() => onUnlock(user)} className="cursor-pointer text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Unlock account
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onSuspend(user)} className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700">
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Suspend account
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
);

export const UserIdentity = ({ user }: { user: AdminUserDto }) => (
  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-0">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.fullName} />
                      <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-700">
                        {user.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{user.fullName}</span>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </div>
);

/** A user on the phone, where eight columns have no room. */
export const AdminUserCard = ({ user, actions }: { user: AdminUserDto; actions: AdminUserActions }) => (
  <li className="space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
    <div className="flex items-start gap-2">
      <button
        type="button"
        aria-label={`View ${user.fullName}`}
        className="min-w-0 flex-1 text-left wrap-anywhere"
        onClick={() => actions.onView(user)}
      >
        <UserIdentity user={user} />
      </button>
      <UserActions user={user} {...actions} />
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <UserRoles user={user} />
      <UserPlan user={user} />
      <UserStatus user={user} />
    </div>
    <p className="text-xs text-slate-500">
      <span className="font-medium text-slate-700 tabular-nums">{user.totalJobs.toLocaleString()}</span>{" "}
      {user.totalJobs === 1 ? "job" : "jobs"} ·{" "}
      <span className="font-medium text-slate-700 tabular-nums">{formatVnd(user.monthlyApiCost)}</span>/month
    </p>
  </li>
);
