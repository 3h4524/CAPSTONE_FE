"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LifeBuoy,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-badges";
import { TicketDetailDialog } from "@/components/support/ticket-detail-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS } from "@/constants/support";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { useSupportTickets } from "@/hooks/queries/use-support-tickets";
import type { SupportTicketSummary, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 8;
const HELP_TOPICS = ["Connect an Etsy shop", "Fix an API key", "Understand credits"] as const;

type TicketView = "all" | "open" | "resolved";

export function SupportCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authQuery = useCurrentUser();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [view, setView] = useState<TicketView>("all");
  const [helpQuery, setHelpQuery] = useState("");
  const [draftSubject, setDraftSubject] = useState("");

  const status = view === "all" ? undefined : view as TicketStatus;
  const filters = useMemo(
    () => ({ pageNumber, pageSize: PAGE_SIZE, status }),
    [pageNumber, status]
  );
  const ticketsQuery = useSupportTickets(filters, authQuery.isSuccess);
  const composeOpen = searchParams.get("compose") === "1";
  const ticketId = searchParams.get("ticket");

  useEffect(() => {
    if (authQuery.isError && axios.isAxiosError(authQuery.error) && authQuery.error.response?.status === 401) {
      const returnUrl = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [authQuery.error, authQuery.isError, pathname, router, searchParams]);

  const openTicket = (id: string) => {
    const params = new URLSearchParams();
    params.set("ticket", id);
    router.push(`/support?${params.toString()}`, { scroll: false });
  };

  const openComposer = (subject = "") => {
    setDraftSubject(subject);
    router.push("/support?compose=1", { scroll: false });
  };

  const closeModal = () => router.replace("/support", { scroll: false });

  const selectView = (nextView: TicketView) => {
    setView(nextView);
    setPageNumber(1);
  };

  const selectHelpTopic = (topic: string) => {
    setHelpQuery(topic);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  if (authQuery.isPending) {
    return <SupportCenterSkeleton />;
  }

  if (authQuery.isError) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(39,55,80,0.08)]">
          <LifeBuoy className="mx-auto size-8 text-slate-400" aria-hidden="true" />
          <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight">Unable to open Support</h1>
          <p className="mt-2 text-sm text-slate-600">Check your connection, then try again.</p>
          <Button className="mt-5 min-h-11" onClick={() => authQuery.refetch()}>
            <RefreshCw aria-hidden="true" />Try again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col text-[#161c22]">
      <main className="mx-auto w-full max-w-[1280px] px-2 pt-2 pb-6 sm:px-4">
        <section
          className="mt-8 grid gap-5 rounded-[22px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(39,55,80,0.055)] sm:px-7 lg:grid-cols-[44px_minmax(280px,0.72fr)_minmax(360px,1.28fr)] lg:items-center lg:gap-x-5 lg:gap-y-4"
          aria-labelledby="support-help-heading"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#f3f6fc] text-[#273750]">
            <LifeBuoy className="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 id="support-help-heading" className="font-display text-xl font-semibold tracking-tight">
              How can we help?
            </h2>
            <p className="mt-1 max-w-md text-sm leading-5 text-slate-600">
              Search setup notes or send a ticket with enough context for the team to investigate.
            </p>
          </div>
          <form
            className="relative lg:self-start"
            onSubmit={(event) => {
              event.preventDefault();
              openComposer(helpQuery.trim());
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="support-help-search" className="sr-only">Search help or start a support request</label>
            <input
              ref={searchInputRef}
              id="support-help-search"
              type="search"
              value={helpQuery}
              onChange={(event) => setHelpQuery(event.target.value)}
              placeholder="Search help articles"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm text-slate-800 shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-slate-500 focus:border-[#273750] focus:ring-3 focus:ring-[#273750]/15"
            />
          </form>
          <div className="flex flex-wrap gap-2 lg:col-start-2 lg:col-end-4" aria-label="Popular help topics">
            {HELP_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-[border-color,background-color,color] hover:border-slate-300 hover:bg-[#f7f9fd] hover:text-[#273750] focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none"
                onClick={() => selectHelpTopic(topic)}
              >
                {topic}
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_16px_45px_rgba(39,55,80,0.055)]" aria-labelledby="support-tickets-heading">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">YOUR REQUESTS</p>
              <h2 id="support-tickets-heading" className="font-display mt-1 text-xl font-semibold tracking-tight">
                Support tickets
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex self-start rounded-full border border-slate-300 bg-white p-0.5" role="group" aria-label="Filter tickets">
                {(["all", "open", "resolved"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={view === item}
                    className={cn(
                      "min-h-8 rounded-full px-3.5 text-sm font-medium text-slate-600 capitalize transition-colors focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none",
                      view === item && "bg-[#eef2fa] font-semibold text-[#273750]"
                    )}
                    onClick={() => selectView(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Button className="min-h-10 self-start px-4 sm:self-auto" onClick={() => openComposer()}>
                <Plus aria-hidden="true" />New ticket
              </Button>
            </div>
          </div>

          {ticketsQuery.isPending ? (
            <TicketListSkeleton />
          ) : ticketsQuery.isError ? (
            <div className="flex min-h-72 flex-col items-center justify-center border-t border-slate-200 p-8 text-center">
              <LifeBuoy className="size-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">Tickets could not be loaded</h3>
              <p className="mt-1 text-sm text-slate-500">Try refreshing this list.</p>
              <Button variant="outline" className="mt-4 min-h-10 border-slate-300 px-4 hover:translate-y-0" onClick={() => ticketsQuery.refetch()}>
                <RefreshCw aria-hidden="true" />Refresh
              </Button>
            </div>
          ) : ticketsQuery.data.items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center border-t border-slate-200 p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-[#f1f4fa]">
                <Inbox className="size-5 text-slate-500" aria-hidden="true" />
              </span>
              <h3 className="font-display mt-4 text-xl font-semibold">No tickets here</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {view === "all" ? "New conversations will appear in this list." : `You do not have any ${view} tickets.`}
              </p>
              <Button className="mt-5 min-h-10 px-4 hover:translate-y-0" onClick={() => openComposer()}>
                <Plus aria-hidden="true" />New ticket
              </Button>
            </div>
          ) : (
            <>
              <TicketTable tickets={ticketsQuery.data.items} onOpen={openTicket} />
              <TicketCards tickets={ticketsQuery.data.items} onOpen={openTicket} />
              <div className="flex min-h-14 items-center justify-between gap-3 border-t border-slate-200 px-5 py-2 sm:px-7">
                <p className="text-xs text-slate-500">
                  Showing {ticketsQuery.data.items.length} of {ticketsQuery.data.totalCount} ticket{ticketsQuery.data.totalCount === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:translate-y-0" disabled={pageNumber <= 1} onClick={() => setPageNumber((page) => page - 1)} aria-label="Previous page">
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="min-w-14 text-center text-xs font-medium text-slate-600 tabular-nums">
                    {pageNumber} / {Math.max(1, ticketsQuery.data.totalPages)}
                  </span>
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:translate-y-0" disabled={pageNumber >= ticketsQuery.data.totalPages} onClick={() => setPageNumber((page) => page + 1)} aria-label="Next page">
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <CreateTicketDialog
        open={composeOpen}
        initialSubject={draftSubject}
        onClose={closeModal}
        onCreated={(id) => router.replace(`/support?ticket=${id}`, { scroll: false })}
      />
      <TicketDetailDialog ticketId={ticketId} onClose={closeModal} />
    </div>
  );
}

function TicketTable({ tickets, onOpen }: { tickets: SupportTicketSummary[]; onOpen: (id: string) => void }) {
  return (
    <div className="hidden overflow-x-auto border-t border-slate-200 md:block">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#f7f9fd] text-[11px] font-semibold tracking-[0.02em] text-slate-600">
          <tr>
            <th scope="col" className="w-[39%] px-7 py-3 font-semibold">Ticket</th>
            <th scope="col" className="px-4 py-3 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3 font-semibold">Priority</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              role="button"
              tabIndex={0}
              aria-label={`Open ${ticket.subject}`}
              className="group cursor-pointer border-t border-slate-200 transition-colors first:border-t-0 hover:bg-[#eef2f8] focus-visible:bg-[#eef2f8] focus-visible:outline-none focus-visible:[&>td]:ring-3 focus-visible:[&>td]:ring-[#273750]/20 focus-visible:[&>td]:ring-inset"
              onClick={() => onOpen(ticket.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(ticket.id);
                }
              }}
            >
              <td className="border-l-[3px] border-l-transparent px-7 py-3.5 transition-[border-color] group-hover:border-l-slate-400 group-focus-visible:border-l-slate-400">
                <span className="block max-w-[430px] truncate font-semibold text-slate-900 group-hover:text-[#273750]">{ticket.subject}</span>
                <span className="mt-1 block text-[11px] text-slate-500">{ticket.ticketNumber}</span>
              </td>
              <td className="px-4 py-3.5 text-slate-600">{CATEGORY_LABELS[ticket.category]}</td>
              <td className="px-4 py-3.5"><TicketPriorityBadge priority={ticket.priority} /></td>
              <td className="px-4 py-3.5"><TicketStatusBadge status={ticket.status} /></td>
              <td className="px-4 py-3.5 text-xs text-slate-600"><time dateTime={ticket.updatedAtUtc}>{formatRelativeDate(ticket.updatedAtUtc)}</time></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketCards({ tickets, onOpen }: { tickets: SupportTicketSummary[]; onOpen: (id: string) => void }) {
  return (
    <ul className="divide-y divide-slate-200 border-t border-slate-200 md:hidden">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <button type="button" className="group w-full border-l-[3px] border-l-transparent px-5 py-4 text-left transition-[border-color,background-color] hover:border-l-slate-400 hover:bg-[#eef2f8] focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none focus-visible:ring-inset" onClick={() => onOpen(ticket.id)}>
            <span className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-900">{ticket.subject}</span>
                <span className="mt-1 block text-[11px] text-slate-500">{ticket.ticketNumber} · {CATEGORY_LABELS[ticket.category]}</span>
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
            </span>
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
              <time className="ml-auto text-xs text-slate-500" dateTime={ticket.updatedAtUtc}>{formatRelativeDate(ticket.updatedAtUtc)}</time>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TicketListSkeleton() {
  return (
    <div className="border-t border-slate-200">
      <div className="hidden h-10 grid-cols-[2fr_1fr_0.75fr_0.9fr_0.7fr] items-center gap-4 bg-[#f7f9fd] px-7 md:grid">
        {["Ticket", "Category", "Priority", "Status", "Updated"].map((label) => <span key={label} className="text-[11px] font-semibold text-slate-500">{label}</span>)}
      </div>
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex min-h-16 items-center gap-5 border-t border-slate-200 px-5 py-3 first:border-t-0 sm:px-7">
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3 max-w-80" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="hidden h-6 w-20 md:block" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function SupportCenterSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-8 px-2 py-6 sm:px-4">
      <div className="space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-11 w-52" /><Skeleton className="h-5 w-[min(100%,520px)]" /></div>
      <Skeleton className="h-40 w-full rounded-[22px]" />
      <Skeleton className="h-[420px] w-full rounded-[22px]" />
    </main>
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const differenceMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return "Just now";
  if (differenceMinutes < 60) return `${differenceMinutes} min ago`;
  if (differenceMinutes < 1_440) return `${Math.floor(differenceMinutes / 60)} hr ago`;
  if (differenceMinutes < 2_880) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
