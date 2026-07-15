"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Statement } from "@/lib/types";

interface Props {
  bookId: string;
  bankAccountId: string;
}

type UploadState = "idle" | "uploading" | "done" | "error";

// Step 2 of the upload flow: a dropzone that posts the file to /api/statements.
export function StatementUploader({ bookId, bankAccountId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Statement | null>(null);

  function pickFile(f: File | null) {
    setError(null);
    setState("idle");
    setUploaded(null);
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setState("uploading");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bookId", bookId);
      form.append("bankAccountId", bankAccountId);

      const res = await fetch("/api/statements", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setUploaded(json.statement);
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  if (state === "done" && uploaded) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
        <h3 className="mt-3 font-semibold">Statement uploaded</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {uploaded.file_name}
          </span>{" "}
          was uploaded and recorded with status{" "}
          <span className="font-medium">{uploaded.status}</span>.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/dashboard/${bookId}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to book
          </Link>
          <Button
            onClick={() => {
              pickFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Upload another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) pickFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input px-6 py-12 text-center transition-colors hover:border-foreground/40",
          dragOver && "border-foreground/60 bg-accent"
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">
          Drag & drop a statement, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">PDF or CSV</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileUp className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <Button onClick={upload} disabled={state === "uploading"} size="sm">
            {state === "uploading" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
