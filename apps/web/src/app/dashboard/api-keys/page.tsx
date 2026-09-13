"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Copy, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const SCOPES = ["files:read", "files:upload", "files:download", "files:delete", "storage:read", "accounts:read"];

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function ApiKeysPage() {
  const { authedFetch } = useAuth();
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(["files:read", "files:upload"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useSWR<{ apiKeys: ApiKey[] }>("/api-keys");
  const keys = data?.apiKeys ?? [];

  function toggleScope(s: string) {
    setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function create() {
    if (!name.trim() || selected.length === 0) {
      setError("Give the key a name and at least one scope.");
      return;
    }
    setBusy(true);
    setError(null);
    setSecret(null);
    try {
      const data = await authedFetch<{ apiKey: ApiKey; secret: string }>("/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: selected }),
      });
      setSecret(data.secret);
      setName("");
      mutate("/api-keys");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string, keyName: string) {
    if (!confirm(`Revoke "${keyName}"? Existing integrations using it will break.`)) return;
    try {
      await authedFetch(`/api-keys/${id}`, { method: "DELETE" });
      mutate("/api-keys");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-1 text-sm text-zinc-500">Bearer <code className="font-mono text-xs">dm_live_…</code> keys. Secret shown once, stored hashed.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {secret && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader><CardTitle>Copy your secret now</CardTitle><CardDescription>It will never be shown again.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">{secret}</code>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(secret)}>
                <Copy /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Create key</CardTitle><CardDescription>Least privilege: only the scopes you need.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input placeholder="e.g. production-uploader" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s}
                onClick={() => toggleScope(s)}
                className={`rounded-full border px-2.5 py-1 font-mono text-xs ${
                  selected.includes(s) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div><Button size="sm" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create key"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{isLoading ? "Loading…" : `${keys.length} key${keys.length === 1 ? "" : "s"}`}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {keys.length === 0 && !isLoading ? (
            <p className="px-5 pb-5 text-sm text-zinc-500">No keys yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="hidden px-5 py-2.5 font-medium md:table-cell">Scopes</th>
                  <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{k.name}</p>
                      <p className="font-mono text-xs text-zinc-500">{k.keyPrefix}…</p>
                    </td>
                    <td className="hidden max-w-72 px-5 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(k.scopes) ? k.scopes : []).map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => revoke(k.id, k.name)} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" /> Revoke
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
