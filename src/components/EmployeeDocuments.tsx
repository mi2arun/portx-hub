"use client";

import { useEffect, useState, useRef } from "react";
import { clientStorage } from "@/lib/firebase-client";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import {
  Plus, Upload, X, Loader2, FileText, Image as ImageIcon, File,
  Download, Eye, Trash2, FolderOpen,
} from "lucide-react";
import { Document as Doc, EMPLOYEE_DOC_CATEGORIES } from "@/lib/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(fileType: string) {
  if (fileType?.startsWith("image/")) return ImageIcon;
  if (fileType === "application/pdf") return FileText;
  return File;
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";

export default function EmployeeDocuments({ employeeId }: { employeeId: string }) {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "", category: "Offer Letter" as string, notes: "", file: null as File | null,
  });

  function loadDocuments() {
    fetch(`/api/documents?employee_id=${employeeId}`)
      .then((r) => r.json())
      .then((data) => { setDocuments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(loadDocuments, [employeeId]);

  function resetUpload() {
    setShowUpload(false);
    setUploadForm({ name: "", category: "Offer Letter", notes: "", file: null });
  }

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
    const storagePath = `documents/employees/${employeeId}/${Date.now()}_${file.name}`;
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
            employee_id: employeeId,
          }),
        });
        setUploading(false);
        resetUpload();
        loadDocuments();
      }
    );
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      const storageRef = ref(clientStorage, doc.file_url);
      await deleteObject(storageRef);
    } catch {
      // File may already be gone from storage; still clean up metadata
    }
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    loadDocuments();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {documents.length} document{documents.length === 1 ? "" : "s"} on file
        </p>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm">
          <Plus className="w-4 h-4" /> Upload
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No documents yet. Upload signed offer letters, ID proofs and certificates.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type);
            return (
              <div key={doc.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {doc.category} · {formatFileSize(doc.file_size)} · {new Date(doc.uploaded_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setPreviewDoc(doc)}
                    className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50" title="Preview">
                    <Eye className="w-4 h-4" />
                  </button>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download={doc.file_name}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                  <button onClick={() => handleDelete(doc)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-500" /> Upload Employee Document
              </h3>
              <button onClick={resetUpload}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
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
                    <p className="text-xs text-gray-400 mt-1">Signed offer letter, PAN, Aadhaar, certificates…</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Name *</label>
                <input value={uploadForm.name}
                  onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Signed Offer Letter" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select value={uploadForm.category}
                  onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputClass}>
                  {EMPLOYEE_DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <button onClick={resetUpload}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
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
              ) : previewDoc.file_type?.startsWith("image/") ? (
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
    </div>
  );
}
