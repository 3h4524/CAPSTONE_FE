"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TFunction } from "i18next";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Inbox,
  KeyRound,
  LifeBuoy,
  type LucideIcon,
  Plus,
  RefreshCw,
  Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets } from "@/hooks/queries/use-support-tickets";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useAuthStore } from "@/stores/auth";
import type { SupportTicketSummary, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 8;

type HelpTopic = {
  id: string;
  icon: LucideIcon;
  keys: string;
};

const HELP_TOPICS: readonly HelpTopic[] = [
  { id: "connect-etsy", icon: Store, keys: "connectEtsy" },
  { id: "fix-api-key", icon: KeyRound, keys: "fixApiKey" },
  { id: "understand-credits", icon: Gauge, keys: "credits" },
] as const;

type TicketView = "all" | "open" | "in_progress" | "resolved" | "closed";
const TICKET_VIEW_LABELS: Record<TicketView, string> = { all: "support.views.all", open: "support.views.open", in_progress: "support.views.in_progress", resolved: "support.views.resolved", closed: "support.views.closed" };
const TICKET_VIEWS: TicketView[] = ["all", "open", "in_progress", "resolved", "closed"];

export function SupportCenter() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [pageNumber, setPageNumber] = useState(1);
  const isPhone = useIsPhone();
  const [view, setView] = useState<TicketView>("all");
  const [selectedHelpTopic, setSelectedHelpTopic] = useState<HelpTopic | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [localReadState, setLocalReadState] = useState<Record<string, string>>({});

  const status = view === "all" ? undefined : view as TicketStatus;
  const filters = useMemo(
    () => ({ pageNumber, pageSize: PAGE_SIZE, status }),
    [pageNumber, status]
  );
  const ticketsQuery = useSupportTickets(filters, Boolean(user));
  const composeOpen = searchParams.get("compose") === "1";
  const ticketId = searchParams.get("ticket");

  useEffect(() => {
    if (ticketId && ticketsQuery.data?.items) {
      const ticket = ticketsQuery.data.items.find(t => t.id === ticketId);
      if (ticket && typeof window !== "undefined") {
        localStorage.setItem(`read_ticket_seller_${ticket.id}`, ticket.updatedAtUtc);
        setLocalReadState(prev => prev[ticket.id] === ticket.updatedAtUtc ? prev : { ...prev, [ticket.id]: ticket.updatedAtUtc });
      }
    }
  }, [ticketId, ticketsQuery.data?.items]);

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
    <div className="text-foreground w-full min-w-0 p-4 sm:p-6">
      <PageHeader
        className="mb-6"
        title={t("support.pageTitle")}
        description={t("support.pageDescription")}
      />

      <div>
        <section
          className="border-ink-200 bg-card rounded-xl border px-5 py-5 shadow-sm max-md:p-4 sm:px-6"
          aria-labelledby="support-help-heading"
        >
          <div className="flex items-start gap-4 max-md:items-center max-md:gap-3">
            <span className="bg-ink-100 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl max-md:size-10">
              <LifeBuoy className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 id="support-help-heading" className="font-display text-xl font-semibold tracking-tight max-md:text-lg">
                {t("support.helpHeading")}
              </h2>
              <p className="text-ink-600 mt-1 max-w-xl text-sm leading-5 max-md:mt-0 max-md:text-xs">
                {t("support.helpDescription")}
              </p>
            </div>
          </div>

          <div className="max-md:border-ink-200 mt-5 flex flex-wrap gap-2 max-md:mt-4 max-md:flex-col max-md:flex-nowrap max-md:gap-0 max-md:divide-y max-md:overflow-hidden max-md:rounded-xl max-md:border max-sm:pl-0 sm:pl-[60px]" aria-label={t("support.popularHelpTopics")}>
            {HELP_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                aria-haspopup="dialog"
                className="group border-ink-200 bg-card text-ink-700 hover:border-ink-300 hover:bg-ink-50 hover:text-primary focus-visible:ring-primary/20 inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:outline-none active:translate-y-0 max-md:min-h-15 max-md:w-full max-md:gap-3 max-md:rounded-none max-md:border-0 max-md:px-3 max-md:text-left"
                onClick={() => setSelectedHelpTopic(topic)}
              >
                <span className="bg-ink-100 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg md:hidden" aria-hidden="true">
                  <topic.icon className="size-4" />
                </span>
                <span className="max-md:min-w-0 max-md:flex-1">
                  <span className="max-md:text-ink-900 max-md:block max-md:font-semibold">{t(`support.helpTopics.${topic.keys}.title`)}</span>
                  <span className="text-ink-500 text-xs font-normal max-md:block max-md:truncate md:hidden">{t(`support.helpTopics.${topic.keys}.description`)}</span>
                </span>
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 max-md:hidden" aria-hidden="true" />
                <ChevronRight className="text-ink-400 size-4 shrink-0 md:hidden" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="border-ink-200 bg-card mt-4 overflow-hidden rounded-xl border shadow-sm" aria-labelledby="support-tickets-heading">
          <div className="flex flex-col gap-4 px-5 py-4 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-ink-500 text-[10px] font-bold tracking-[0.16em]">{t("support.yourRequests")}</p>
              <h2 id="support-tickets-heading" className="font-display mt-1 text-xl font-semibold tracking-tight max-md:text-lg">
                {t("support.supportTickets")}
              </h2>
            </div>
            <div className="flex flex-col gap-3 max-md:contents sm:flex-row sm:items-center">
              {isPhone ? (
                <Select value={view} onValueChange={(next) => selectView(next as TicketView)}>
                  <SelectTrigger aria-label={t("support.filterTickets")} className="bg-card w-full max-md:col-span-2 max-md:row-start-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-card w-(--radix-select-trigger-width)">
                    {TICKET_VIEWS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(TICKET_VIEW_LABELS[item])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
              <div className="border-border bg-background flex max-w-full flex-wrap self-start rounded-2xl border p-0.5 sm:inline-flex sm:flex-nowrap sm:rounded-full" role="group" aria-label={t("support.filterTickets")}>
                {TICKET_VIEWS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={view === item}
                    className={cn(
                      "focus-visible:ring-primary/20 min-h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:outline-none",
                      view === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => selectView(item)}
                  >
                    {t(TICKET_VIEW_LABELS[item])}
                  </button>
                ))}
              </div>
              )}
              <Button size="page-action" className="min-h-10 self-start px-4 max-md:col-start-2 max-md:row-start-1 sm:self-auto" aria-label={t("support.newTicket")} onClick={() => openComposer()}>
                <Plus aria-hidden="true" /><span>{t("support.newShort")}<span className="max-md:hidden">{t("support.ticketSuffix")}</span></span>
              </Button>
            </div>
          </div>

          {ticketsQuery.isPending ? (
            <SectionLoading label={t("support.loadingTickets")} />
          ) : ticketsQuery.isError ? (
            <div className="border-ink-200 flex min-h-72 flex-col items-center justify-center border-t p-8 text-center">
              <LifeBuoy className="text-ink-400 size-8" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{t("support.ticketsLoadFailedTitle")}</h3>
              <p className="text-ink-500 mt-1 text-sm">{t("support.ticketsLoadFailedDescription")}</p>
              <Button variant="outline" className="border-ink-300 mt-4 min-h-10 px-4 hover:translate-y-0" onClick={() => ticketsQuery.refetch()}>
                <RefreshCw aria-hidden="true" />{t("support.refresh")}
              </Button>
            </div>
          ) : ticketsQuery.data.items.length === 0 ? (
            <div className="border-ink-200 flex min-h-72 flex-col items-center justify-center border-t p-8 text-center">
              <span className="bg-ink-100 flex size-12 items-center justify-center rounded-xl">
                <Inbox className="text-ink-500 size-5" aria-hidden="true" />
              </span>
              <h3 className="font-display mt-4 text-xl font-semibold">{t("support.noTicketsTitle")}</h3>
              <p className="text-ink-500 mt-1 max-w-sm text-sm">
                {view === "all" ? t("support.noTicketsEmpty") : t("support.noTicketsViewOther", { view })}
              </p>
              <Button className="mt-5 min-h-10 px-4 hover:translate-y-0" onClick={() => openComposer()}>
                <Plus aria-hidden="true" />{t("support.newTicket")}
              </Button>
            </div>
          ) : (
            <>
              <TicketTable tickets={ticketsQuery.data.items} onOpen={openTicket} selectedTicketId={ticketId} localReadState={localReadState} setLocalReadState={setLocalReadState} />
              <TicketCards tickets={ticketsQuery.data.items} onOpen={openTicket} selectedTicketId={ticketId} localReadState={localReadState} setLocalReadState={setLocalReadState} />
              <div className="border-ink-200 flex min-h-14 items-center justify-between gap-3 border-t px-5 py-2 sm:px-7">
                <p className="text-ink-500 text-xs">
                  {t("support.showingCount", { count: ticketsQuery.data.totalCount, shown: ticketsQuery.data.items.length, total: ticketsQuery.data.totalCount })}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:translate-y-0" disabled={pageNumber <= 1} onClick={() => setPageNumber((page) => page - 1)} aria-label={t("support.previousPage")}>
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="text-ink-600 min-w-14 text-center text-xs font-medium tabular-nums">
                    {pageNumber} / {Math.max(1, ticketsQuery.data.totalPages)}
                  </span>
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:translate-y-0" disabled={pageNumber >= ticketsQuery.data.totalPages} onClick={() => setPageNumber((page) => page + 1)} aria-label={t("support.nextPage")}>
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
              <p className="text-ink-500 text-[10px] font-semibold tracking-[0.16em] uppercase">
                {t("support.quickGuide")}
              </p>
              <DialogTitle className="font-display text-xl tracking-tight">
                {t(`support.helpTopics.${selectedHelpTopic.keys}.title`)}
              </DialogTitle>
              <DialogDescription className="leading-5">
                {t(`support.helpTopics.${selectedHelpTopic.keys}.description`)}
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3" aria-label={t("support.stepsFor", { title: t(`support.helpTopics.${selectedHelpTopic.keys}.title`) })}>
              {[1, 2, 3, 4].map((index) => (
                <li key={index} className="text-ink-700 flex gap-3 text-sm leading-5">
                  <span className="bg-ink-100 text-primary flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                    {index}
                  </span>
                  <span className="pt-0.5">{t(`support.helpTopics.${selectedHelpTopic.keys}.step${index}`)}</span>
                </li>
              ))}
            </ol>

            <div className="border-ink-200 bg-ink-50 text-ink-600 rounded-lg border px-4 py-3 text-xs leading-5">
              <span className="text-ink-800 font-semibold">{t("support.goodToKnow")}:</span>{" "}
              {t(`support.helpTopics.${selectedHelpTopic.keys}.note`)}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("support.close")}</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  const subject = t(`support.helpTopics.${selectedHelpTopic.keys}.ticketSubject`);
                  setSelectedHelpTopic(null);
                  openComposer(subject);
                }}
              >
                <Plus aria-hidden="true" />{t("support.createSupportTicket")}
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

function TicketTable({ tickets, onOpen, selectedTicketId, localReadState, setLocalReadState }: { tickets: SupportTicketSummary[]; onOpen: (id: string) => void; selectedTicketId: string | null; localReadState: Record<string, string>; setLocalReadState: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const { t, i18n } = useTranslation("common");

  return (
    <div className="border-ink-200 hidden overflow-x-auto border-t md:block">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-ink-50 text-ink-600 text-[11px] font-semibold tracking-[0.02em]">
          <tr>
            <th scope="col" className="w-[39%] px-7 py-3 font-semibold">{t("support.tableTicket")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("support.tableCategory")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("support.tablePriority")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("support.tableStatus")}</th>
            <th scope="col" className="px-4 py-3 font-semibold">{t("support.tableUpdated")}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const isSelected = selectedTicketId === ticket.id;
            const isReadLocally = isSelected || (typeof window !== "undefined" && localStorage.getItem(`read_ticket_seller_${ticket.id}`) === ticket.updatedAtUtc) || localReadState[ticket.id] === ticket.updatedAtUtc;
            const hasUnread = ticket.hasUnreadMessages && !isReadLocally;
            return (
            <tr
              key={ticket.id}
              role="button"
              tabIndex={0}
              aria-label={t("support.openTicket", { subject: ticket.subject })}
              className="group border-ink-200 hover:bg-ink-100 focus-visible:bg-ink-100 focus-visible:[&>td]:ring-primary/20 cursor-pointer border-t transition-colors first:border-t-0 focus-visible:outline-none focus-visible:[&>td]:ring-3 focus-visible:[&>td]:ring-inset"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem(`read_ticket_seller_${ticket.id}`, ticket.updatedAtUtc);
                  setLocalReadState(prev => ({ ...prev, [ticket.id]: ticket.updatedAtUtc }));
                }
                onOpen(ticket.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (typeof window !== "undefined") {
                    localStorage.setItem(`read_ticket_seller_${ticket.id}`, ticket.updatedAtUtc);
                    setLocalReadState(prev => ({ ...prev, [ticket.id]: ticket.updatedAtUtc }));
                  }
                  onOpen(ticket.id);
                }
              }}
            >
              <td className="group-hover:border-l-ink-400 group-focus-visible:border-l-ink-400 border-l-[3px] border-l-transparent px-7 py-3.5 transition-[border-color]">
                <div className="flex items-center gap-2">
                  <span className={cn("group-hover:text-primary block max-w-[430px] truncate", hasUnread ? "text-ink-900 font-bold" : "text-ink-900 font-semibold")}>{ticket.subject}</span>
                  {hasUnread && (
                    <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-rose-600 uppercase shadow-sm dark:bg-rose-500/15 dark:text-rose-400">{t("support.unreadNew")}</span>
                  )}
                </div>
                <span className="text-ink-500 mt-1 block text-[11px]">
                  #{ticket.ticketNumber} {ticket.lastMessageSnippet && <span className={cn("ml-1", hasUnread ? "text-ink-800 font-semibold" : "")}>• {ticket.lastMessageSnippet}</span>}
                </span>
              </td>
              <td className="text-ink-600 px-4 py-3.5">{t(`support.categories.${ticket.category}`)}</td>
              <td className="px-4 py-3.5"><TicketPriorityBadge priority={ticket.priority} /></td>
              <td className="px-4 py-3.5"><TicketStatusBadge status={ticket.status} /></td>
              <td className="text-ink-600 px-4 py-3.5 text-xs"><time dateTime={ticket.updatedAtUtc}>{formatRelativeDate(ticket.updatedAtUtc, t, i18n.language)}</time></td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TicketCards({ tickets, onOpen, selectedTicketId, localReadState, setLocalReadState }: { tickets: SupportTicketSummary[]; onOpen: (id: string) => void; selectedTicketId: string | null; localReadState: Record<string, string>; setLocalReadState: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const { t, i18n } = useTranslation("common");

  return (
    <ul className="divide-ink-200 border-ink-200 divide-y border-t md:hidden">
      {tickets.map((ticket) => {
        const isSelected = selectedTicketId === ticket.id;
        const isReadLocally = isSelected || (typeof window !== "undefined" && localStorage.getItem(`read_ticket_seller_${ticket.id}`) === ticket.updatedAtUtc) || localReadState[ticket.id] === ticket.updatedAtUtc;
        const hasUnread = ticket.hasUnreadMessages && !isReadLocally;
        return (
        <li key={ticket.id}>
          <button type="button" className="group hover:border-l-ink-400 hover:bg-ink-100 focus-visible:ring-primary/20 w-full border-l-[3px] border-l-transparent px-5 py-4 text-left transition-[border-color,background-color] focus-visible:ring-3 focus-visible:outline-none focus-visible:ring-inset" onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.setItem(`read_ticket_seller_${ticket.id}`, ticket.updatedAtUtc);
              setLocalReadState(prev => ({ ...prev, [ticket.id]: ticket.updatedAtUtc }));
            }
            onOpen(ticket.id);
          }}>
            <span className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("block truncate", hasUnread ? "text-ink-900 font-bold" : "text-ink-900 font-semibold")}>{ticket.subject}</span>
                  {hasUnread && (
                    <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-rose-600 uppercase shadow-sm dark:bg-rose-500/15 dark:text-rose-400">{t("support.unreadNew")}</span>
                  )}
                </div>
                <span className="text-ink-500 mt-1 block text-[11px]">
                  {ticket.ticketNumber} · {t(`support.categories.${ticket.category}`)}
                  {ticket.lastMessageSnippet && <span className={cn("mt-0.5 block truncate", hasUnread ? "text-ink-800 font-semibold" : "text-ink-400")}>{ticket.lastMessageSnippet}</span>}
                </span>
              </span>
              <ChevronRight className="text-ink-400 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            </span>
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
              <time className="text-ink-500 ml-auto text-xs" dateTime={ticket.updatedAtUtc}>{formatRelativeDate(ticket.updatedAtUtc, t, i18n.language)}</time>
            </span>
          </button>
        </li>
        );
      })}
    </ul>
  );
}

function formatRelativeDate(value: string, t: TFunction, locale: string) {
  const date = new Date(value);
  const differenceMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return t("support.justNow");
  if (differenceMinutes < 60) return t("support.minAgo", { count: differenceMinutes });
  if (differenceMinutes < 1_440) return t("support.hrAgo", { count: Math.floor(differenceMinutes / 60) });
  if (differenceMinutes < 2_880) return t("support.yesterday");
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
}
