"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/domain/profile";
import { prepareAvatar } from "@/lib/avatar-image";

export function AvatarPicker({ value, name, onChange, onBusyChange }: { value: string | null; name: string; onChange: (value: string | null) => void; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { request.current++; onBusyChange(false); }, [onBusyChange]);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-4">
      <Avatar className="size-20">
        {value && <AvatarImage src={value} alt="Your profile photo preview" />}
        <AvatarFallback className="bg-primary-soft text-xl text-primary-soft-text">{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => input.current?.click()}><Camera aria-hidden="true" />{busy ? "Preparing image…" : value ? "Change photo" : "Upload photo"}</Button>
        {value && <Button type="button" variant="ghost" size="lg" disabled={busy} onClick={() => { request.current++; onChange(null); setError(""); }}>Remove photo</Button>}
      </div>
      <input ref={input} type="file" aria-label="Upload profile photo" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const id = ++request.current;
        setBusy(true); onBusyChange(true); setError("");
        try { const image = await prepareAvatar(file); if (id === request.current) onChange(image); }
        catch (error) { if (id === request.current) setError(error instanceof Error ? error.message : "Could not prepare this image."); }
        finally { if (id === request.current) { setBusy(false); onBusyChange(false); } }
      }} />
    </div>
    <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 10 MB. Cropped to a square; Save applies your new photo.</p>
    {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
  </div>;
}
