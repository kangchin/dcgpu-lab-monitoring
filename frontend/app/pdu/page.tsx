"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

interface FailedPdu {
  hostname: string;
  reason: string;
}

interface SyncResponse {
  status: string;
  message: string;
  notice?: string;
  timestamp?: string;
  sync_result: {
    message: string;
    pdu_count: number;
    successful_updates: number;
    failed_updates: number;
    success_rate?: string;
    execution_time_seconds?: number;
    failed_pdus?: FailedPdu[];
    migration?: {
      apparent_power_oid?: {
        total_processed: number;
        updated: number;
        skipped: number;
        errors: number;
      };
    };
  };
}

export default function PduPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncPdus = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pdu/sync-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `PDU sync failed (${response.status})`);
      }

      setResult(data as SyncResponse);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "PDU sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const summary = result?.sync_result;
  const migration = summary?.migration?.apparent_power_oid;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <Database size={18} />
            Infrastructure data
          </div>
          <h1 className="font-clashDisplay text-4xl font-semibold">PDU synchronization</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Scan for PDUs and update their network, SNMP, and location data in the database.
          </p>
        </div>
        <button
          type="button"
          onClick={syncPdus}
          disabled={isSyncing}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isSyncing ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          {isSyncing ? "Syncing PDUs..." : "Sync all PDU data"}
        </button>
      </header>

      {isSyncing && (
        <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <LoaderCircle className="mt-0.5 shrink-0 animate-spin" size={20} />
          <div>
            <p className="font-semibold">Synchronization in progress</p>
            <p className="mt-1 text-sm opacity-80">Network discovery and SNMP requests may take several minutes.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold">Synchronization failed</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {summary && (
        <section className="space-y-6" aria-live="polite">
          <div className="flex items-start gap-3 border-b border-border pb-5">
            <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold">Synchronization complete</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{summary.message}</p>
              {result.notice && <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{result.notice}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-5">
            {[
              ["Processed", summary.pdu_count],
              ["Updated", summary.successful_updates],
              ["Failed", summary.failed_updates],
              ["Success rate", summary.success_rate ?? "N/A"],
              ["Duration", summary.execution_time_seconds != null ? `${summary.execution_time_seconds}s` : "N/A"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-background p-4 dark:bg-background-dark">
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-2 truncate text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {migration && (
            <div>
              <h3 className="mb-3 text-base font-semibold">Apparent power OID migration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <p><span className="block text-gray-500">Processed</span>{migration.total_processed}</p>
                <p><span className="block text-gray-500">Updated</span>{migration.updated}</p>
                <p><span className="block text-gray-500">Skipped</span>{migration.skipped}</p>
                <p><span className="block text-gray-500">Errors</span>{migration.errors}</p>
              </div>
            </div>
          )}

          {summary.failed_pdus && summary.failed_pdus.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-red-700 dark:text-red-400">Failed PDUs</h3>
              <div className="overflow-hidden rounded-md border border-red-200 dark:border-red-900">
                {summary.failed_pdus.map((failedPdu) => (
                  <div key={failedPdu.hostname} className="border-b border-red-100 px-4 py-3 last:border-b-0 dark:border-red-950">
                    <p className="font-mono text-sm font-semibold">{failedPdu.hostname}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{failedPdu.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}