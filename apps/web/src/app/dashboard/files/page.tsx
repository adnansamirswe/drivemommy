"use client";

import { useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Search, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { API_URL, formatBytes } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type FileRow = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
  connectedAccount: { id: string; email: string; provider: string };
};

export default function FilesPage() {
  const { authedFetch } = useAuth();
  const { mutate } = useSWRConfig();
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncScope, setSyncScope] = useState<"drivemommy" | "full">("drivemommy");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = `/files?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { data, isLoading } = useSWR<{ files: FileRow[] }>(key);
  const files = data?.files ?? [];

  function onSearch(v: string) {
    setQ(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQ(v.trim()), 400);
  }

  async function onSync(scope: "drivemommy" | "full" = syncScope) {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const data = await authedFetch<{ results: { accountId: string; created: number; updated: number; deleted: number }[] }>("/files/sync-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const total = data.results.reduce((acc, r) => acc + r.created + r.updated, 0);
      setNotice(`Synced ${data.results.length} drive(s): ${total} file(s) indexed.`);
      mutate(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function onUploadPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { message?: string }).message ?? "Upload failed.");
      setNotice(`Uploaded ${file.name}.`);
      mutate(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Move "${name}" to trash?`)) return;
    try {
      await authedFetch(`/files/${id}`, { method: "DELETE" });
      mutate(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Files</h1>
          <p className="mt-1 text-sm text-zinc-500">Search across drives. Uploads route to the drive with space.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={onUploadPicked} />
          <div className="flex items-center gap-2">
            <select
              value={syncScope}
              onChange={(e) => setSyncScope(e.target.value as "drivemommy" | "full")}
              className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm"
            >
              <option value="drivemommy">drivemommy folder only</option>
              <option value="full">Full Drive</option>
            </select>
            <Button variant="outline" size="sm" disabled={syncing} onClick={() => onSync()}>
              <RefreshCw className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync"}
            </Button>
            <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <UploadCloud /> {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input className="pl-9" placeholder="Search files…" value={q} onChange={(e) => onSearch(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading…" : `${files.length} file${files.length === 1 ? "" : "s"}`}</CardTitle>
          <CardDescription>Newest first. Stored under each Drive&apos;s drivemommy folder.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {files.length === 0 && !isLoading ? (
            <p className="px-5 pb-5 text-sm text-zinc-500">No files indexed yet. Click Sync Drive to scan your Google Drive, or Upload a new file.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="hidden px-5 py-2.5 font-medium md:table-cell">Drive</th>
                  <th className="px-5 py-2.5 font-medium">Size</th>
                  <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="max-w-64 truncate px-5 py-3 font-medium">{f.name}</td>
                    <td className="hidden max-w-48 truncate px-5 py-3 text-zinc-500 md:table-cell">{f.connectedAccount.email}</td>
                    <td className="px-5 py-3 text-zinc-500">{formatBytes(f.sizeBytes)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onDelete(f.id, f.name)}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
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
