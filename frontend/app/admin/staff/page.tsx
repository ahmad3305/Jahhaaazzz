"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/app/config";


const styles: Record<string, React.CSSProperties> = {
  bg: { minHeight: "100vh", width: "100vw", background: "linear-gradient(140deg, #1e293b 70%, #2563eb 110%)", color: "#e6eefb", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif", padding: 0 },
  shell: { maxWidth: 950, margin: "0 auto", padding: "45px 18px 55px 18px", minHeight: "100vh" },
  title: { fontSize: 27, fontWeight: 800, color: "#60a5fa", marginBottom: 26, letterSpacing: 0.5, background: "none" },
  card: { background: "linear-gradient(110deg,#111827 70%, #1d4ed822 100%)", borderRadius: 15, boxShadow: "0 8px 36px #1e293b40, 0 2px 8px #2563eb33", border: "1.3px solid #2563eb26", marginBottom: 21, padding: "29px 25px 24px 25px" },
  error: { background: "#3f1d1d", color: "#fecaca", fontWeight: 600, padding: "14px 24px", borderRadius: 8, border: "1.5px solid #f87171", margin: "16px 0 8px", fontSize: 16, textAlign: "center" },
  loading: { color: "#93c5fd", fontSize: 18, padding: 23, textAlign: "center", fontWeight: 500 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 15.5, background: "none" },
  th: { textAlign: "left", color: "#9dc3fa", fontWeight: 700, padding: "12px 7px", borderBottom: "1.5px solid #2563eb32", background: "none" },
  td: { padding: "10px 7px", borderBottom: "1px solid #2563eb21", background: "none" },
  actionBtn: { background: "#2563eb", color: "#fff", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", marginRight: 8 },
  shiftsBtn: { background: "#38bdf8", color: "#1e293b", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 15, border: "none", marginRight: 8, cursor: "pointer" },
  headerBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
  headerActions: { display: "flex", gap: 13 },
  addStaffBtn: { padding: "9px 22px", background: "linear-gradient(90deg,#2563eb 75%, #0ea5e9)", border: "none", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 16, boxShadow: "0 2px 8px #2563eb33", cursor: "pointer" },
  allShiftsBtn: { padding: "9px 18px", background: "#1e293b", color: "#93c5fd", border: "1.3px solid #2563eb46", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" },
};

type Staff = {
  staff_id: number;
  first_name: string;
  last_name: string;
  role: string;
  staff_type: string;
  status: string;
  airport_name?: string;
  airport_code?: string;
  total_shifts?: number;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${API_BASE}/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Unable to fetch staff");
        setStaff(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load staff.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <div style={styles.headerBar}>
          <div style={styles.title}>👔 Staff Directory</div>
          <div style={styles.headerActions}>
            <button style={styles.addStaffBtn} onClick={() => router.push("/admin/staff/create")}>
              + Add Staff
            </button>
            <button style={styles.allShiftsBtn} onClick={() => router.push("/admin/staff/shifts")}>
              See All Shifts
            </button>
          </div>
        </div>
        <div style={styles.card}>
          {error && <div style={styles.error}>{error}</div>}
          {loading ? (
            <div style={styles.loading}>Loading staff...</div>
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Airport</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Total Shifts</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#fca5a5", padding: 16 }}>
                        No staff found.
                      </td>
                    </tr>
                  ) : (
                    staff.map(s => (
                      <tr key={s.staff_id}>
                        <td style={styles.td}><b>{s.first_name} {s.last_name}</b></td>
                        <td style={styles.td}>{s.role}</td>
                        <td style={styles.td}>{s.staff_type}</td>
                        <td style={styles.td}>
                          {s.airport_name || "--"}
                          {s.airport_code ? <> (<span style={{ color: "#60a5fa" }}>{s.airport_code}</span>)</> : null}
                        </td>
                        <td style={styles.td}>{s.status}</td>
                        <td style={styles.td}>{s.total_shifts ?? "0"}</td>
                        <td style={styles.td}>
                          <button
                            style={styles.actionBtn}
                            onClick={() => router.push(`/admin/staff/${s.staff_id}/edit`)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.shiftsBtn}
                            onClick={() => router.push(`/admin/staff/${s.staff_id}/shifts`)}
                          >
                            See Shifts
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

