"use client";

import { useState, useRef, useTransition, type DragEvent, type ChangeEvent } from "react";
import { Upload, Link, FileText, Loader2, Check } from "lucide-react";
import { ingestPdf, ingestFromUrl } from "../../_actions/rag";

interface PaperUploadProps {
  onUploadComplete?: (paperId: string) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function PaperUpload({ onUploadComplete }: PaperUploadProps) {
  // PDF file upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // URL input state
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState(false);
  const [isDownloading, startDownloadTransition] = useTransition();

  // --- File validation ---
  function validateFile(file: File): string | null {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return "Only PDF files are accepted";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File exceeds the maximum allowed size of 20 MB";
    }
    return null;
  }

  // --- File selection handlers ---
  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setUploadSuccess(false);

    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    setFileError(null);
    setUploadSuccess(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  // --- Upload handler ---
  function handleUpload() {
    if (!selectedFile) return;

    startUploadTransition(async () => {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await ingestPdf(formData);

      if (result.error) {
        setFileError(result.error);
        return;
      }

      setUploadSuccess(true);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (result.data?.paperId) {
        onUploadComplete?.(result.data.paperId);
      }
    });
  }

  // --- URL validation ---
  function validateUrl(input: string): string | null {
    if (!input.trim()) return "Please enter a URL";
    try {
      const parsed = new URL(input.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "URL must start with http:// or https://";
      }
    } catch {
      return "Please enter a valid URL";
    }
    if (input.trim().length > 2048) {
      return "URL must be 2048 characters or fewer";
    }
    return null;
  }

  // --- URL ingest handler ---
  function handleUrlIngest() {
    setUrlError(null);
    setUrlSuccess(false);

    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }

    startDownloadTransition(async () => {
      const result = await ingestFromUrl(url.trim());

      if (result.error) {
        setUrlError(result.error);
        return;
      }

      setUrlSuccess(true);
      setUrl("");

      if (result.data?.paperId) {
        onUploadComplete?.(result.data.paperId);
      }
    });
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* PDF File Upload Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <Upload className="h-4 w-4 text-amber-500" />
          Upload PDF
        </h4>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
            isDragOver
              ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
          }`}
        >
          <FileText className="mb-2 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Drag & drop a PDF here, or{" "}
            <span className="font-medium text-amber-600 dark:text-amber-400">
              click to browse
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">PDF files only, up to 20 MB</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select PDF file"
        />

        {/* Selected file info */}
        {selectedFile && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {selectedFile.name}
              </span>
              <span className="text-xs text-zinc-400">
                ({formatFileSize(selectedFile.size)})
              </span>
            </div>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {isUploading ? "Uploading..." : "Upload & Index"}
            </button>
          </div>
        )}

        {/* File error */}
        {fileError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{fileError}</p>
        )}

        {/* Upload success */}
        {uploadSuccess && (
          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            PDF uploaded successfully! Indexing in progress.
          </div>
        )}
      </div>

      {/* URL Input Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <Link className="h-4 w-4 text-amber-500" />
          Import from URL
        </h4>

        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError(null);
              setUrlSuccess(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUrlIngest()}
            type="url"
            placeholder="https://example.com/paper.pdf"
            className="block flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            onClick={handleUrlIngest}
            disabled={isDownloading || !url.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link className="h-3.5 w-3.5" />
            )}
            {isDownloading ? "Downloading..." : "Download & Index"}
          </button>
        </div>

        {/* URL error */}
        {urlError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{urlError}</p>
        )}

        {/* URL success */}
        {urlSuccess && (
          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            PDF downloaded successfully! Indexing in progress.
          </div>
        )}
      </div>
    </div>
  );
}
