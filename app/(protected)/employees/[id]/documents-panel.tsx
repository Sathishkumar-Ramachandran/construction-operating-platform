"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, CircleCheck, CircleAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  requestDocumentUploadAction,
  confirmDocumentUploadAction,
  getDocumentDownloadUrlAction,
} from "@/actions/hr-document-actions";
import { useMasterDataOptions } from "@/components/hr/use-master-data-options";
import type { listEmployeeDocuments, DocumentChecklistItem } from "@/lib/services/employee-document-service";

type Document = Awaited<ReturnType<typeof listEmployeeDocuments>>[number];

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function DocumentsPanel({
  employeeId,
  documents,
  checklist,
  canUpload,
}: {
  employeeId: string;
  documents: Document[];
  checklist: DocumentChecklistItem[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data } = useMasterDataOptions("document-types");

  function startUpload(forDocumentTypeId?: string) {
    if (forDocumentTypeId) setDocumentTypeId(forDocumentTypeId);
    if (!forDocumentTypeId && !documentTypeId) {
      toast.error("Select a document type first.");
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !documentTypeId) {
      if (!documentTypeId) toast.error("Select a document type first.");
      return;
    }

    setUploading(true);
    const requestResult = await requestDocumentUploadAction({
      employeeId,
      documentTypeId,
      originalFileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    });

    if (!requestResult.ok) {
      toast.error(requestResult.message);
      setUploading(false);
      return;
    }

    try {
      const putResponse = await fetch(requestResult.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResponse.ok) throw new Error("Upload failed.");

      const checksum = await sha256Hex(file);

      const confirmResult = await confirmDocumentUploadAction({
        employeeId,
        documentTypeId,
        storageKey: requestResult.data.storageKey,
        originalFileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        checksum,
      });
      if (!confirmResult.ok) {
        toast.error(confirmResult.message);
        return;
      }
      toast.success("Document uploaded.");
      router.refresh();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(documentId: string) {
    const result = await getDocumentDownloadUrlAction(documentId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      {checklist.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Required for this designation</h4>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li
                key={item.documentTypeId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ChecklistIcon status={item.status} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.documentTypeName}</p>
                    {item.isMandatory ? (
                      <p className="text-xs text-muted-foreground">Mandatory</p>
                    ) : null}
                  </div>
                </div>
                {item.status === "MISSING" ? (
                  canUpload ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startUpload(item.documentTypeId)}>
                      <Upload className="size-3.5" aria-hidden /> Upload
                    </Button>
                  ) : (
                    <Badge variant="outline">Missing</Badge>
                  )
                ) : (
                  <Badge variant="outline">{item.status}</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canUpload ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={documentTypeId} onValueChange={(v) => setDocumentTypeId(v ?? "")}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              {(data ?? []).map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={uploading}
            onClick={() => startUpload()}
          >
            <Upload className="size-4" aria-hidden /> {uploading ? "Uploading…" : "Upload document"}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState title="No documents uploaded" description="Employee documents will appear here once uploaded." />
      ) : (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{document.originalFileName}</p>
                <p className="text-xs text-muted-foreground">{document.documentType.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{document.status}</Badge>
                <Button size="icon-sm" variant="ghost" onClick={() => handleDownload(document.id)}>
                  <Download className="size-4" aria-hidden />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChecklistIcon({ status }: { status: DocumentChecklistItem["status"] }) {
  if (status === "MISSING" || status === "REJECTED" || status === "EXPIRED") {
    return <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden />;
  }
  if (status === "VERIFIED") {
    return <CircleCheck className="size-4 shrink-0 text-gold" aria-hidden />;
  }
  return <CircleAlert className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
}
