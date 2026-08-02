"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  requestProjectDocumentUploadAction,
  confirmProjectDocumentUploadAction,
  getProjectDocumentDownloadUrlAction,
  archiveProjectDocumentAction,
} from "@/actions/project-document-actions";
import { useMasterDataOptions } from "@/components/hr/use-master-data-options";

type DocumentRow = {
  id: string;
  originalFileName: string;
  isConfidential: boolean;
  createdAt: Date | string;
  documentType: { id: string; name: string };
};

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Shared upload/list/download/archive UI for anything backed by
 * ProjectDocument (Project or Lead) — mirrors employees/[id]/documents-panel.tsx's
 * flow exactly, generalized across the two scopes via `scope`. */
export function DocumentManagerPanel({
  scope,
  documents,
  canUpload,
}: {
  scope: { projectId?: string; leadId?: string };
  documents: DocumentRow[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [uploading, setUploading] = useState(false);
  const { data: documentTypes } = useMasterDataOptions("document-types");

  function startUpload() {
    if (!documentTypeId) {
      toast.error("Select a document type first.");
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !documentTypeId) return;

    setUploading(true);
    const requestResult = await requestProjectDocumentUploadAction({
      ...scope,
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
      const confirmResult = await confirmProjectDocumentUploadAction({
        ...scope,
        documentTypeId,
        storageKey: requestResult.data.storageKey,
        originalFileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        checksum,
        isConfidential: requestResult.data.isConfidential,
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
    const result = await getProjectDocumentDownloadUrlAction(documentId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    window.open(result.data.url, "_blank");
  }

  async function handleArchive(documentId: string) {
    const result = await archiveProjectDocumentAction(documentId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Document archived.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canUpload ? (
        <div className="flex items-center gap-2">
          <Select value={documentTypeId} onValueChange={(value) => setDocumentTypeId(value ?? "")}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Document type" /></SelectTrigger>
            <SelectContent>
              {(documentTypes ?? []).map((type) => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" disabled={uploading} onClick={startUpload}>
            <Upload className="size-3.5" aria-hidden /> {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState icon={Upload} title="No documents yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="flex items-center gap-2">
                  {document.originalFileName}
                  {document.isConfidential ? <Badge variant="outline">Confidential</Badge> : null}
                </TableCell>
                <TableCell>{document.documentType.name}</TableCell>
                <TableCell>{new Date(document.createdAt).toLocaleDateString("en-SG")}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => handleDownload(document.id)}>
                    <Download className="size-3.5" aria-hidden />
                  </Button>
                  {canUpload ? (
                    <Button size="icon-sm" variant="ghost" onClick={() => handleArchive(document.id)}>
                      <Archive className="size-3.5" aria-hidden />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
