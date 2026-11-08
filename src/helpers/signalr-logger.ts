/* eslint-disable no-console */
import { type ILogger, LogLevel } from "@microsoft/signalr";

/**
 * Messages SignalR raises when the API is briefly unreachable: a restart, a deploy, a sleeping laptop.
 * The hubs reconnect on their own, so these are warnings; logged as errors they fill the Next.js dev overlay.
 */
const transientPattern =
  /disconnected|WebSocket closed|Failed to start the connection|Failed to complete negotiation|stopped during negotiation|Failed to fetch|Server timeout|reconnect/i;

export const isTransientHubError = (error: unknown) =>
  transientPattern.test(error instanceof Error ? error.message : String(error));

/** Shared logger for every hub: warnings and above, with temporary connection loss downgraded to a warning. */
export const signalrLogger: ILogger = {
  log(level: LogLevel, message: string) {
    if (level < LogLevel.Warning) return;
    if (level >= LogLevel.Error && !transientPattern.test(message)) console.error(`[SignalR] ${message}`);
    else console.warn(`[SignalR] ${message}`);
  },
};
