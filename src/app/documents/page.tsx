"use client";

import { useEffect, useState, useRef } from "react";
import { clientStorage } from "@/lib/firebase-client";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { TableSkeleton } from "@/components/Skeleton";
import {
  Plus, Search, Filter, FolderOpen, Trash2, Download, Eye,
  Upload, X, Loader2, FileText, Image as ImageIcon, File,
  Building2, Receipt, Users, Landmark, Shield, MoreHorizontal,
} from "lucide-react";

type Document = {
  id: string;
  name: string;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  notes: string;
  client_id: string;
  uploaded_at: string;
};

const CATEGORIES = [
  "Company",
  "Tax & GST",
  "Contract",
  "Client",
  "Bank",
  "Invoice",
  "Other",
];

const categoryIcons: Record<string, any> = {
  Company: Building2,
  "Tax & GST": Receipt,
  Contract: FileText,
  Client: Users,
  Bank: Landmark,
  Invoice: FileText,
  Other: File,
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  Company: { bg: "bg-violet-50", text: "text-violet-600" },
  "Tax & GST": { bg: "bg-amber-50", text: "text-amber-600" },
  Contract: { bg: "bg-blue-50", text: "text-blue-600" },
  Client: { bg: "bg-emerald-50", text: "text-emerald-600" },
  Bank: { bg: "bg-indigo-50", text: "text-indigo-600" },
  Invoice: { bg: "bg-pink-50", text: "text-pink-600" },
  Other: { bg: "bg-gray-100", text: "text-gray-600" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType === "application/pdf") return FileText;
  return File;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "", category: "Company", notes: "", file: null as File | null,
  });

  function loadDocuments() {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => { setDocuments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadDocuments(); }, []);

  function handleFileSelect(file: File) {
    setUploadForm((f) => ({
      ...f,
      file,
      name: f.name || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    }));
  }

  async function handleUpload() {
    if (!uploadForm.file || !uploadForm.name) return;
    setUploading(true);
    setUploadProgress(0);

    const file = uploadForm.file;
    const storagePath = `documents/${Date.now()}_${file.name}`;
    const storageRef = ref(clientStorage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed",
      (snapshot) => {
        setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => {
        console.error("Upload failed:", error);
        alert("Upload failed. Please try again.");
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: uploadForm.name,
            category: uploadForm.category,
            file_name: file.name,
            file_url: downloadURL,
            file_size: file.size,
            file_type: file.type,
            notes: uploadForm.notes,
          }),
        });

        setUploading(false);
        setShowUpload(false);
        setUploadForm({ name: "", category: "Company", notes: "", file: null });
        loadDocuments();
      }
    );
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;

    // Delete from Firebase Storage
    try {
      const storageRef = ref(clientStorage, doc.file_url);
      await deleteObject(storageRef);
    } catch {
      // File may already be deleted from storage, continue with metadata cleanup
    }

    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    loadDocuments();
  }

  const filtered = documents.filter((doc) => {
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    if (!search) return matchesCategory;
    const q = search.toLowerCase();
    return matchesCategory && (
      doc.name.toLowerCase().includes(q) ||
      doc.file_name.toLowerCase().includes(q) ||
      doc.notes?.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q)
    );
  });

  const categoryCounts = documents.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Store and manage company documents</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Upload
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-500" /> Upload Document
              </h3>
              <button onClick={() => { setShowUpload(false); setUploadForm({ name: "", category: "Company", notes: "", file: null }); }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  uploadForm.file ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-violet-400", "bg-violet-50"); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove("border-violet-400", "bg-violet-50"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-violet-400", "bg-violet-50");
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
                />
                {uploadForm.file ? (
                  <div>
                    <FileText className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">{uploadForm.file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatFileSize(uploadForm.file.size)}</p>
                    <p className="text-xs text-violet-600 mt-2">Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Drop a file here or <span className="text-violet-600 font-medium">browse</span></p>
                    <p className="text-xs text-gray-400 mt-1">PDF, images, docs, spreadsheets</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Name *</label>
                <input value={uploadForm.name}
                  onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., GST Certificate 2025-26" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select value={uploadForm.category}
                  onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea value={uploadForm.notes} rows={2}
                  onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional description" className={inputClass} />
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={handleUpload}
                  disabled={uploading || !uploadForm.file || !uploadForm.name}
                  className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Upload"}
                </button>
                <button onClick={() => { setShowUpload(false); setUploadForm({ name: "", category: "Company", notes: "", file: null }); }}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{previewDoc.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{previewDoc.file_name} &middot; {formatFileSize(previewDoc.file_size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" download={previewDoc.file_name}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50 flex items-center justify-center min-h-[400px]">
              {previewDoc.file_type === "application/pdf" ? (
                <iframe src={previewDoc.file_url} className="w-full h-full min-h-[600px] rounded-lg border border-gray-200" />
              ) : previewDoc.file_type.startsWith("image/") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewDoc.file_url} alt={previewDoc.name} className="max-w-full max-h-[70vh] rounded-lg shadow-sm" />
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">Preview not available for this file type</p>
                  <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" download={previewDoc.file_name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : documents.length === 0 && !showUpload ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No documents yet</h3>
          <p className="text-sm text-gray-500 mb-6">Upload your first document to get started.</p>
          <button onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      ) : (
        <>
          {/* Category pills */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === "all" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              All ({documents.length})
            </button>
            {CATEGORIES.filter((c) => categoryCounts[c]).map((cat) => {
              const colors = categoryColors[cat] || categoryColors.Other;
              return (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    categoryFilter === cat ? `${colors.bg} ${colors.text}` : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {cat} ({categoryCounts[cat]})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search documents..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500" />
          </div>

          {/* Documents grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">No documents match your search</div>
            ) : (
              filtered.map((doc) => {
                const FileIcon = getFileIcon(doc.file_type);
                const CatIcon = categoryIcons[doc.category] || File;
                const colors = categoryColors[doc.category] || categoryColors.Other;

                return (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                    {/* Preview area */}
                    <div className="h-36 bg-gray-50 flex items-center justify-center cursor-pointer relative"
                      onClick={() => setPreviewDoc(doc)}>
                      {doc.file_type.startsWith("image/") ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className="w-12 h-12 text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Eye className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.file_name}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${colors.bg} ${colors.text}`}>
                          <CatIcon className="w-3 h-3" />
                          {doc.category}
                        </span>
                      </div>

                      {doc.notes && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doc.notes}</p>}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <div className="text-xs text-gray-400">
                          {formatFileSize(doc.file_size)} &middot; {new Date(doc.uploaded_at).toLocaleDateString("en-IN")}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50" title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download={doc.file_name}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => handleDelete(doc)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
