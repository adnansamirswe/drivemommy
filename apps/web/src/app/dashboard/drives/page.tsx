"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { RefreshCw, Unplug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/api";

type Account = {
  id: string;
  provider: string;
  email: string;
  displayName: string | null;
  status: string;
  storageAccount: {
    totalBytes: string | null;
    usedBytes: string;
    availableBytes: string | null;
    lastSyncedAt: string | null;
  } | null;
};

export default function DrivesPage() {
  const { authedFetch } = useAuth();
  const { mutate } = useSWRConfig();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useSWR<{ accounts: Account[] }>("/connected-accounts");
  const accounts = data?.accounts ?? [];

  async function connect() {
    setError(null);
    try {
      const data = await authedFetch<{ url: string }>("/connected-accounts/google/connect-url");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google connect. Is OAuth configured in Settings?");
    }
  }

  async function sync(id: string) {
    setBusyId(id);
    try {
      await authedFetch(`/connected-accounts/${id}/sync-quota`, { method: "POST" });
      mutate("/connected-accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(id: string, email: string) {
    if (!confirm(`Disconnect ${email}? Files stay on Google Drive.`)) return;
    setBusyId(id);
    try {
      await authedFetch(`/connected-accounts/${id}`, { method: "DELETE" });
      mutate("/connected-accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drives</h1>
          <p className="mt-1 text-sm text-zinc-500">Each row is one Google account. Uploads route by free space.</p>
        </div>
        <Button size="sm" onClick={connect}>Connect Google Drive</Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading…" : `${accounts.length} connected`}</CardTitle>
          <CardDescription>Quota syncs automatically after connect.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 && !isLoading ? (
            <p className="px-5 pb-5 text-sm text-zinc-500">
              No drives connected. If connect fails, set your Google OAuth credentials in Settings first.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Account</th>
                  <th className="px-5 py-2.5 font-medium">Used</th>
                  <th className="hidden px-5 py-2.5 font-medium md:table-cell">Free</th>
                  <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{a.displayName || a.email}</p>
                      <p className="text-xs text-zinc-500">{a.email} <Badge className="ml-1">{a.provider}</Badge></p>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{formatBytes(a.storageAccount?.usedBytes ?? null)}</td>
                    <td className="hidden px-5 py-3 text-zinc-600 md:table-cell">{formatBytes(a.storageAccount?.availableBytes ?? null)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          disabled={busyId === a.id}
                          onClick={() => sync(a.id)}
                          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Sync
                        </button>
                        <button
                          disabled={busyId === a.id}
                          onClick={() => disconnect(a.id, a.email)}
                          className="inline-flex items-center gap-1 text-zinc-500 hover:text-red-600 disabled:opacity-50"
                        >
                          <Unplug className="h-3.5 w-3.5" /> Disconnect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
