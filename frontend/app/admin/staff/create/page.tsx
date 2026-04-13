"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/app/config";

const styles: Record<string, React.CSSProperties> = {
  bg: { minHeight: "100vh", width: "100vw", background: "linear-gradient(140deg, #1e293b 70%, #2563eb 110%)", color: "#e6eefb", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif", padding: 0 },
  shell: { maxWidth: 600, margin: "0 auto", padding: "45px 18px 55px 18px", minHeight: "100vh" },
  title: { fontSize: 27, fontWeight: 800, color: "#60a5fa", marginBottom: 26, letterSpacing: 0.5, background: "none" },
  card: { background: "linear-gradient(110deg,#111827 70%, #1d4ed822 100%)", borderRadius: 15, boxShadow: "0 8px 36px #1e293b40, 0 2px 8px #2563eb33", border: "1.3px solid #2563eb26", marginBottom: 21, padding: "29px 25px 24px 25px" },
  error: { background: "#3f1d1d", color: "#fecaca", fontWeight: 600, padding: "14px 24px", borderRadius: 8, border: "1.5px solid #f87171", margin: "16px 0 8px", fontSize: 16, textAlign: "center" },
  errorList: { background: "#3f1d1d", color: "#fecaca", fontWeight: 600, fontSize: 15.5, padding: "10px 18px", borderRadius: 10, border: "1.2px solid #f87171", margin: "13px 0 11px", lineHeight: 1.8 },
  loading: { color: "#93c5fd", fontSize: 18, padding: 23, textAlign: "center", fontWeight: 500 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 17px", marginBottom: 13 },
  labelGroup: { display: "flex", flexDirection: "column", gap: 7 },
  label: { color: "#93c5fd", fontWeight: 500, fontSize: 15.8, marginBottom: -2 },
  input: { background: "#1e293b", border: "1.2px solid #2563eb39", borderRadius: 7, color: "#e6eefb", fontSize: 16.5, padding: "9px 12px", outline: "none" },
  actionBar: { display: "flex", gap: 17, marginTop: 16 },
  submitBtn: { background: "linear-gradient(90deg,#2563eb 77%, #0ea5e9)", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 16.5, padding: "10px 33px", cursor: "pointer", boxShadow: "0 2px 8px #2563eb33" },
  cancelBtn: { background: "none", color: "#93c5fd", border: "1.3px solid #2563eb56", borderRadius: 8, fontWeight: 600, fontSize: 16.5, padding: "10px 32px", cursor: "pointer" },
};

type Airport = { airport_id: number; airport_name: string; airport_code: string };

export default function StaffCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    airport_id: "",
    first_name: "",
    last_name: "",
    role: "",
    staff_type: "",
    status: "Active",
    license_number: "",
    hire_date: "",
  });
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loadingAirports, setLoadingAirports] = useState(true);
  const [error, setError] = useState("");
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadAirports() {
      setLoadingAirports(true);
      try {
        const res = await fetch(`${API_BASE}/airports`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load airports");
        setAirports(json.data as Airport[]);
      } catch (e: any) {
        setError(e?.message || "Could not load airports.");
      } finally {
        setLoadingAirports(false);
      }
    }
    loadAirports();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setApiErrors([]);
    setError("");

    const token = localStorage.getItem("token") || "";

    try {
      const res = await fetch(`${API_BASE}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          airport_id: form.airport_id ? Number(form.airport_id) : undefined,
          hire_date: form.hire_date || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.errors && Array.isArray(json.errors)) setApiErrors(json.errors);
        throw new Error(json.message);
      }
      router.push("/(admin)/staff");
    } catch (e: any) {
      setError(e?.message || "Failed to create staff");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <h2 style={styles.title}>Add Staff Member</h2>
        <div style={styles.card}>
          {error && <div style={styles.error}>{error}</div>}
          {apiErrors.length > 0 && (
            <div style={styles.errorList}>
              {apiErrors.map((err, n) => (<div key={n}>{err}</div>))}
            </div>
          )}

          <form style={styles.form} onSubmit={handleSubmit}>

            <div style={styles.fieldsGrid}>
              <div style={styles.labelGroup}>
                <label style={styles.label}>Airport *</label>
                <select
                  name="airport_id"
                  value={form.airport_id}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  disabled={loadingAirports}
                >
                  <option value="">-- Select Airport --</option>
                  {airports.map(a => (
                    <option key={a.airport_id} value={a.airport_id}>
                      {a.airport_name} ({a.airport_code})
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>Role *</label>
                <input
                  name="role"
                  style={styles.input}
                  value={form.role}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  placeholder="e.g. Pilot"
                />
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>First Name *</label>
                <input
                  name="first_name"
                  style={styles.input}
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>Last Name *</label>
                <input
                  name="last_name"
                  style={styles.input}
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>Staff Type *</label>
                <input
                  name="staff_type"
                  style={styles.input}
                  value={form.staff_type}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>Status *</label>
                <select
                  name="status"
                  value={form.status}
                  style={styles.input}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>License Number</label>
                <input
                  name="license_number"
                  style={styles.input}
                  value={form.license_number}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="(if applicable)"
                />
              </div>
              <div style={styles.labelGroup}>
                <label style={styles.label}>Hire Date</label>
                <input
                  type="date"
                  name="hire_date"
                  style={styles.input}
                  value={form.hire_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={styles.actionBar}>
              <button type="submit" style={styles.submitBtn} disabled={submitting}>
                {submitting ? "Saving..." : "Add Staff"}
              </button>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => router.push("/(admin)/staff")}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
