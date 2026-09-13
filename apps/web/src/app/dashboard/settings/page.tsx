"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

type Policy = { mode: string; priorityAccountIds: string[] };

const MODES = [
  { id: "most_available", title: "Most available", desc: "Drive with the most free space wins." },
  { id: "round_robin", title: "Round robin", desc: "Spread uploads evenly across drives." },
  { id: "priority", title: "Priority", desc: "First drive with space in your ordered list wins." },
];

export default function SettingsPage() {
  const { authedFetch } = useAuth();
  const { mutate } = useSWRConfig();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data } = useSWR<{ policy: Policy }>("/storage/routing-policy");
  const policy = data?.policy ?? null;

  async function saveMode(mode: string) {
    setError(null);
    setNotice(null);
    try {
      const data = await authedFetch<{ policy: Policy }>("/storage/routing-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      mutate("/storage/routing-policy", data, false);
      setNotice(`Routing set to ${mode.replace("_", " ")}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Upload routing policy across your connected drives.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <Card>
        <CardHeader><CardTitle>Upload routing</CardTitle><CardDescription>Which drive receives each upload.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => saveMode(m.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                policy?.mode === m.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{m.desc}</p>
              {policy?.mode === m.id && <Badge className="mt-2">Active</Badge>}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
