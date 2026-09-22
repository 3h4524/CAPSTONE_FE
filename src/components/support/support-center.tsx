"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LifeBuoy,
  Plus,
  RefreshCw,
} from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-badges";
import { TicketDetailDialog } from "@/components/support/ticket-detail-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORY_LABELS } from "@/constants/support";
import { useSupportTickets } from "@/hooks/queries/use-support-tickets";
import { useAuthStore } from "@/stores/auth";
import type { SupportTicketSummary, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 8;

type HelpTopic = {
  id: string;
  title: string;
  description: string;
  steps: readonly string[];
  note: string;
  ticketSubject: string;
};

const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "connect-etsy",
    title: "Connect an Etsy shop",
    description:
      "Connect your Etsy shop so APCS can prepare and publish listings from your workspace.",
    steps: [
      "Open API keys from the Workspace menu and select Add API key.",
      "Choose Etsy and start the connection flow.",
      "Sign in to the correct Etsy account and approve the requested permissions.",
      "Return to APCS and confirm that the connection status is Connected.",
    ],
    note: "Use the Etsy account that owns the shop you want APCS to publish to.",
    ticketSubject: "Help connecting an Etsy shop",
  },
  {
    id: "fix-api-key",
    title: "Fix an API key",
    description:
      "A key usually needs attention when it expired, was revoked, or no longer has the permissions APCS requires.",
    steps: [
      "Open API keys and find the provider that needs attention.",
      "Confirm the key is still active in the provider account and has the required permissions.",
      "Select Edit, paste the replacement key, and save your changes.",
      "Run the connection check again and confirm the status is Connected.",
    ],
    note: "For security, APCS only displays the masked credential. Never include a full API key in a support ticket.",
    ticketSubject: "API key connection needs attention",
  },
  {
    id: "understand-credits",
    title: "Understand credits",
    description:
      "Your plan includes an allowance used by generation and publishing activity in the workspace.",
    steps: [
      "Open Usage to review images, videos, listings, and estimated provider costs.",
      "Use the date-range selector to compare activity across different periods.",
      "Check Credit allowance to see the amount used, the plan limit, and the reset date.",
      "Open Billing if you need to review or change the subscription attached to the workspace.",
    ],
    note: "Usage data can take a short time to appear after a workflow finishes.",
    ticketSubject: "Question about credits or usage",
  },
] as const;

type TicketView = "all" | "open" | "resolved";

export function SupportCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [pageNumber, setPageNumber] = useState(1);
  const [view, setView] = useState<TicketView>("all");
  const [selectedHelpTopic, setSelectedHelpTopic] = useState<HelpTopic | null>(null);
  const [draftSubject, setDraftSubject] = useState("");

  const status = view === "all" ? undefined : view as TicketStatus;
  const filters = useMemo(
    () => ({ pageNumber, pageSize: PAGE_SIZE, status }),
    [pageNumber, status]
  );
  const ticketsQuery = useSupportTickets(filters, Boolean(user));
  const composeOpen = searchParams.get("compose") === "1";
  const ticketId = searchParams.get("ticket");

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

  return (
    <div className="w-full min-w-0 p-4 text-[#161c22] sm:p-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Support center</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Find setup guidance, contact the support team, and track your requests.
        </p>
      </header>

      <div>
        <section
          className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6"
          aria-labelledby="support-help-heading"
        >
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2fa] text-[#273750]">
              <LifeBuoy className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 id="support-help-heading" className="font-display text-xl font-semibold tracking-tight">
                How can we help?
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">
                Choose a quick guide for the questions sellers ask most often.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 sm:pl-[60px]" aria-label="Popular help topics">
            {HELP_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                aria-haspopup="dialog"
                className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-[#f7f9fd] hover:text-[#273750] focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none active:translate-y-0"
                onClick={() => setSelectedHelpTopic(topic)}
              >
                {topic.title}
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="support-tickets-heading">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">YOUR REQUESTS</p>
              <h2 id="support-tickets-heading" className="font-display mt-1 text-xl font-semibold tracking-tight">
                Support tickets
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="border-border bg-background inline-flex self-start rounded-full border p-0.5" role="group" aria-label="Filter tickets">
                {(["all", "open", "resolved"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={view === item}
                    className={cn(
                      "min-h-8 rounded-full px-3.5 text-sm font-medium capitalize transition-colors focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none",
                      view === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <SectionLoading label="Loading tickets" />
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
      </div>

      <Dialog
        open={selectedHelpTopic !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHelpTopic(null);
        }}
      >
        {selectedHelpTopic ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Quick guide
              </p>
              <DialogTitle className="font-display text-xl tracking-tight">
                {selectedHelpTopic.title}
              </DialogTitle>
              <DialogDescription className="leading-5">
                {selectedHelpTopic.description}
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3" aria-label={`Steps for ${selectedHelpTopic.title}`}>
              {selectedHelpTopic.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-5 text-slate-700">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#eef2fa] text-xs font-semibold text-[#273750]">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-lg border border-slate-200 bg-[#f7f9fd] px-4 py-3 text-xs leading-5 text-slate-600">
              <span className="font-semibold text-slate-800">Good to know:</span>{" "}
              {selectedHelpTopic.note}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  const subject = selectedHelpTopic.ticketSubject;
                  setSelectedHelpTopic(null);
                  openComposer(subject);
                }}
              >
                <Plus aria-hidden="true" />Create support ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <CreateTicketDialog
        open={composeOpen}
        initialSubject={draftSubject}
        onClose={closeModal}
        onCreated={closeModal}
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

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const differenceMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return "Just now";
  if (differenceMinutes < 60) return `${differenceMinutes} min ago`;
  if (differenceMinutes < 1_440) return `${Math.floor(differenceMinutes / 60)} hr ago`;
  if (differenceMinutes < 2_880) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
