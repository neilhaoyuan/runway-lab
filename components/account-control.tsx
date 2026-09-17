"use client";

import type { User } from "@supabase/supabase-js";
import { Check, Cloud, CloudOff, LoaderCircle, LogOut, Mail, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODEL_STORAGE_KEY, useFinancialModel } from "./financial-model-provider";

export function AccountControl() {
  const model = useFinancialModel();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setSending(true);
    setMessage(null);
    const next = `${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setSending(false);
    setMessage(error ? error.message : "Check your email for a secure sign-in link.");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    localStorage.removeItem(MODEL_STORAGE_KEY);
    window.location.assign("/dashboard");
  }

  const statusText = user
    ? model.setupRequired ? "Set up" : model.cloudStatus === "saving" ? "Saving…" : model.cloudStatus === "saved" ? "Saved" : model.cloudStatus === "error" ? "Sync issue" : "Cloud"
    : "Sign in";
  const StatusIcon = user ? model.cloudStatus === "saving" || model.cloudStatus === "loading" ? LoaderCircle : model.cloudStatus === "error" ? CloudOff : Cloud : CloudOff;

  return <>
    <button onClick={() => setOpen(true)} title={model.cloudMessage ?? statusText} className="button-ghost !h-10 !px-3 text-xs"><StatusIcon size={14} className={model.cloudStatus === "saving" || model.cloudStatus === "loading" ? "animate-spin" : ""} /> {statusText}</button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-md border border-line bg-panel shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-line p-5"><div><p className="text-base font-semibold">{user ? "Cloud save" : "Save your workspace"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{user ? "Your approved statements and scenarios sync automatically." : "Sign in by email to access this model from another browser."}</p></div><button aria-label="Close account dialog" onClick={() => setOpen(false)}><X size={17} className="text-zinc-500" /></button></div>
        {user ? <div className="p-5"><div className="flex items-center gap-3 rounded border border-line p-3"><span className="grid h-8 w-8 place-items-center rounded bg-acid/10 text-acid"><Check size={15} /></span><div className="min-w-0"><p className="truncate text-sm text-zinc-200">{user.email}</p><p className="mt-0.5 text-xs text-zinc-500">{model.cloudMessage ?? "Connected to Supabase"}</p></div></div><button onClick={signOut} className="button-ghost mt-4 w-full text-xs"><LogOut size={14} /> Sign out</button><p className="mt-3 text-[10px] leading-4 text-zinc-600">Signing out clears the financial model cached in this browser. Your cloud copy remains available after signing in again.</p></div> : supabase ? <form onSubmit={signIn} className="p-5"><label className="text-xs text-zinc-400">Email address<input autoFocus type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="input mt-2" /></label><button disabled={sending} className="button-primary mt-4 w-full text-xs"><Mail size={14} /> {sending ? "Sending…" : "Email me a sign-in link"}</button>{message && <p className="mt-3 text-xs leading-5 text-zinc-400">{message}</p>}<p className="mt-4 text-[10px] leading-4 text-zinc-600">The demo continues to work locally without signing in. Only parsed financial data is synced; the Excel file itself is not uploaded.</p></form> : <div className="p-5 text-sm leading-6 text-zinc-400">Add your Supabase project URL and publishable key to <span className="font-mono text-zinc-300">.env.local</span> to enable sign-in. Local storage remains active.</div>}
      </div>
    </div>}
  </>;
}
