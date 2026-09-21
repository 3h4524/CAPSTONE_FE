"use client";

import React from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminUserDto } from "@/types/admin";
import { cn } from "@/utils/cn";

type AdminUsersTableProps = {
  users: AdminUserDto[];
  onView: (user: AdminUserDto) => void;
  onEdit: (user: AdminUserDto) => void;
  onSuspend: (user: AdminUserDto) => void;
  onUnlock: (user: AdminUserDto) => void;
  onCopyId: (id: string) => void;
}

export const AdminUsersTable = ({
  users,
  onView,
  onEdit,
  onSuspend,
  onUnlock,
  onCopyId,
}: AdminUsersTableProps) => {
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="w-12 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
              NO.
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              USER
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              ROLE
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              PLAN
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              STATUS
            </TableHead>
            <TableHead className="w-28 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
              JOBS
            </TableHead>
            <TableHead className="w-32 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
              API COST/MO
            </TableHead>
            <TableHead className="w-28 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
              ACTIONS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user, index) => (
              <TableRow key={user.id} className="hover:bg-slate-50/80">
                <TableCell className="text-center font-medium text-slate-500">
                  {index + 1}
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-center font-medium text-slate-700">
                  {user.totalJobs}
                </TableCell>
                <TableCell className="text-center text-slate-600">
                  ${user.monthlyApiCost.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
