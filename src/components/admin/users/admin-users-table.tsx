"use client";

import React from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");

  if (isPhone) {
    return (
      <div>
        {users.length === 0 ? (
          <p className="text-ink-500 py-8 text-center text-sm">{t("admin.users.noUsersFound")}</p>
        ) : (
          <ul className="space-y-2.5">
            {users.map((user) => (
              <AdminUserCard key={user.id} user={user} actions={actions} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="border-ink-200 bg-card rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-ink-50/80 hover:bg-ink-50/80">
            <TableHead className="text-ink-500 w-12 text-center text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tableNo")}
            </TableHead>
            <TableHead className="text-ink-500 text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tableUser")}
            </TableHead>
            <TableHead className="text-ink-500 text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tableRole")}
            </TableHead>
            <TableHead className="text-ink-500 text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tablePlan")}
            </TableHead>
            <TableHead className="text-ink-500 text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tableStatus")}
            </TableHead>
            <TableHead className="text-ink-500 w-28 text-center text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tableJobs")}
            </TableHead>
            <TableHead className="text-ink-500 w-32 text-center text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tablePlanPrice")}
            </TableHead>
            <TableHead className="text-ink-500 w-28 text-center text-xs font-semibold tracking-wider uppercase">
              {t("admin.users.tableActions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-ink-500 h-24 text-center">
                {t("admin.users.noUsersFound")}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user, index) => (
              <TableRow key={user.id} className="hover:bg-ink-50/80">
                <TableCell className="text-ink-500 text-center font-medium">
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
                <TableCell className="text-ink-700 text-center font-medium">
                  {user.totalJobs}
                </TableCell>
                <TableCell className="text-ink-600 text-center font-medium">
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
