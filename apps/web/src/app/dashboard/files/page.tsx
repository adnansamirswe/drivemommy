"use client";

import { useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Search, RefreshCw, Trash2, UploadCloud, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useAuthedSWR } from "@/lib/swr";
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

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export default function FilesPage() {
  const { authedFetch } = useAuth();
  const { mutate } = useSWRConfig();
  const [q, setQ] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = `/files?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { data, isLoading } = useAuthedSWR<{ files: FileRow[] }>(key);
  const files = data?.files ?? [];

  function onSearch(v: string) {
    setQ(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQ(v.trim()), 400);
  }

  async function onSync() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const data = await authedFetch<{ results: { accountId: string; created: number; updated: number; deleted: number }[] }>("/files/sync-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "mergedrive" }),
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

  function onUploadPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);

    const id = crypto.randomUUID();
    const item: UploadItem = { id, file, progress: 0, status: "uploading" };
    setUploads((prev) => [...prev, item]);

    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/uploads`);
    xhr.setRequestHeader("Authorization", `Bearer ${getAccessToken() ?? ""}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: 100, status: "done" } : u)));
        mutate(key);
        setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== id)), 2000);
      } else {
        let msg = "Upload failed.";
        try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch {}
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: msg } : u)));
      }
    };

    xhr.onerror = () => {
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: "Network error." } : u)));
    };

    xhr.send(form);
    if (fileRef.current) fileRef.current.value = "";
  }

  function dismissUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
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

  const activeUploads = uploads.filter((u) => u.status === "uploading");

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
            <Button variant="outline" size="sm" disabled={syncing} onClick={() => onSync()}>
              <RefreshCw className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync"}
            </Button>
            <Button size="sm" disabled={activeUploads.length > 0} onClick={() => fileRef.current?.click()}>
              <UploadCloud /> {activeUploads.length > 0 ? `Uploading ${activeUploads.length}…` : "Upload"}
            </Button>
          </div>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{u.file.name}</p>
                  <span className="shrink-0 text-xs text-zinc-500">{formatBytes(String(u.file.size))}</span>
                </div>
                {u.status === "uploading" && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-300"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{u.progress}%</p>
                  </div>
                )}
                {u.status === "done" && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded successfully
                  </div>
                )}
                {u.status === "error" && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" /> {u.error}
                  </div>
                )}
              </div>
              <button onClick={() => dismissUpload(u.id)} className="shrink-0 text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input className="pl-9" placeholder="Search files…" value={q} onChange={(e) => onSearch(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading…" : `${files.length} file${files.length === 1 ? "" : "s"}`}</CardTitle>
          <CardDescription>Newest first. Stored under each Drive&apos;s mergedrive folder.</CardDescription>
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
