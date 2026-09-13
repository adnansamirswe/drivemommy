"use client";

import Link from "next/link";
import { ArrowUpRight, HardDrive, Files, Database, Cpu, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthedSWR } from "@/lib/swr";
import { formatBytes } from "@/lib/api";

type Summary = {
  totalBytes: string;
  usedBytes: string;
  availableBytes: string;
  accounts: { id: string; provider: string; email: string; usedBytes: string; availableBytes: string | null }[];
};

export default function DashboardOverview() {
  const { data: summary, error: summaryErr } = useAuthedSWR<Summary>("/storage/summary");
  const { data: fileData } = useAuthedSWR<{ files: unknown[] }>("/files?limit=1");

  const error = summaryErr?.message || null;
  const fileCount = fileData?.files?.length ?? 0;
  const totalPooled = summary ? formatBytes(summary.totalBytes) : "…";
  const used = summary ? formatBytes(summary.usedBytes) : "…";
  const free = summary ? formatBytes(summary.availableBytes) : "…";
  const drives = summary?.accounts.length ?? 0;

  const usagePercent = summary
    ? Math.round((Number(summary.usedBytes) / Number(summary.totalBytes)) * 100) || 0
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your storage at a glance.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
              <Database className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total pooled</p>
              <p className="text-2xl font-semibold">{totalPooled}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{drives} connected {drives === 1 ? "drive" : "drives"}</p>
        </div>

        <div className="stat-card rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
              <Cpu className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Used</p>
              <p className="text-2xl font-semibold">{used}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${usagePercent}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{free} free</p>
          </div>
        </div>

        <div className="stat-card rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
              <Files className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Files</p>
              <p className="text-2xl font-semibold">{String(fileCount)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Indexed across all drives</p>
        </div>

        <div className="stat-card rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
              <HardDrive className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Drives</p>
              <p className="text-2xl font-semibold">{drives}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Google accounts linked</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Connect a Drive</CardTitle>
                <CardDescription>OAuth with offline access. Add as many as you need.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/drives">
              <Button size="sm" className="gap-1.5">
                Manage drives <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Developer API</CardTitle>
                <CardDescription>Scoped keys for upload, list, download, delete.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/api-keys">
              <Button variant="outline" size="sm" className="gap-1.5">
                Manage keys <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
