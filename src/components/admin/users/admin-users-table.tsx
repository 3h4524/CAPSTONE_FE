"use client";

import React from "react";

import type { AdminUserActions} from "@/components/admin/users/admin-user-parts";
import { AdminUserCard, UserActions, UserIdentity, UserPlan, UserRoles, UserStatus } from "@/components/admin/users/admin-user-parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { AdminUserDto } from "@/types/admin";
import { formatVnd } from "@/utils/format-currency";

interface AdminUsersTableProps extends AdminUserActions {
  users: AdminUserDto[];
}

export const AdminUsersTable = ({ users, ...actions }: AdminUsersTableProps) => {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No users found.</p>
        ) : (
          <ul className="divide-y">
            {users.map((user) => (
              <AdminUserCard key={user.id} user={user} actions={actions} />
            ))}
          </ul>
        )}
      </div>
    );
  }

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
              PLAN PRICE
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
                  <UserIdentity user={user} />
                </TableCell>
                <TableCell>
                  <UserRoles user={user} />
                </TableCell>
                <TableCell>
                  <UserPlan user={user} />
                </TableCell>
                <TableCell>
                  <UserStatus user={user} />
                </TableCell>
                <TableCell className="text-center font-medium text-slate-700">
                  {user.totalJobs}
                </TableCell>
                <TableCell className="text-center font-medium text-slate-600">
                  {formatVnd(user.monthlyApiCost)}
                </TableCell>
                <TableCell className="text-center">
                  <UserActions user={user} {...actions} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
