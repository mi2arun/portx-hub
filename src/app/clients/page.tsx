"use client";

import { useEffect, useState } from "react";
import ClientForm from "@/components/ClientForm";
import { TableSkeleton } from "@/components/Skeleton";
import { Plus, Search, Users, X, Pencil, Trash2, Globe, MapPin } from "lucide-react";

type Client = {
  id: string;
  name: string;
  address: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  currency: string;
  is_international: boolean | number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [search, setSearch] = useState("");

  function loadClients() {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => { setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadClients(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to delete client");
      return;
    }
    loadClients();
  }

  function handleSave() {
    setShowForm(false);
    setEditing(null);
    loadClients();
  }

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your clients and billing details</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showForm || editing) && (
        <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {editing ? `Edit: ${editing.name}` : "New Client"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ClientForm
            client={editing ? { ...editing, is_international: !!editing.is_international } : undefined}
            onSave={handleSave}
          />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No clients yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add your first client to start creating invoices.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      ) : (
        <>
          {clients.length > 3 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-md pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Currency</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">No clients match your search</td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        {client.gstin && <p className="text-xs text-gray-400 mt-0.5">GSTIN: {client.gstin}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-500">{client.state ? `${client.state}, ` : ""}{client.country}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-gray-700">{client.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.is_international ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600">
                            <Globe className="w-3 h-3" /> International
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600">
                            <MapPin className="w-3 h-3" /> Domestic
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setEditing(client); setShowForm(false); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 inline-flex"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 inline-flex ml-1"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
