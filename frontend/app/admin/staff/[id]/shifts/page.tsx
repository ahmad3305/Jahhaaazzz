"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_BASE } from "@/app/config";

type Shift = {
  shift_id: number;
  staff_id: number;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  availability_status: string;
  staff_first_name?: string;
  staff_last_name?: string;
  staff_role?: string;
  staff_type?: string;
};

export default function StaffShiftsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${API_BASE}/shifts?staff_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Could not fetch shifts");
        setShifts(json.data || []);
        if (json.data?.length && json.data[0].staff_first_name) {
          setStaffName(`${json.data[0].staff_first_name} ${json.data[0].staff_last_name}`);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load shifts.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <h2 style={styles.title}>
          Shifts for Staff {staffName ? `- ${staffName}` : `#${id}`}
        </h2>
        <div style={styles.card}>
          {error && <div style={styles.error}>{error}</div>}
          {loading ? (
            <div style={styles.loading}>Loading shifts...</div>
          ) : shifts.length === 0 ? (
            <div style={{ ...styles.loading, color: "#fca5a5" }}>
              No shifts found for this staff member.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Start</th>
                  <th style={styles.th}>End</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(shift => (
                  <tr key={shift.shift_id}>
                    <td style={styles.td}>{shift.shift_date}</td>
                    <td style={styles.td}>{shift.shift_start}</td>
                    <td style={styles.td}>{shift.shift_end}</td>
                    <td style={styles.td}>{shift.availability_status}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.actionBtn}
                        onClick={() =>
                          router.push(
                            `/admin/staff/shifts/${shift.shift_id}/edit`
                          )
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={styles.actionBar}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => router.push("/admin/staff")}
          >
            Back to Staff List
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: { minHeight: "100vh", width: "100vw", background: "linear-gradient(140deg, #1e293b 70%, #2563eb 110%)", color: "#e6eefb", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif", padding: 0 },
  shell: { maxWidth: 750, margin: "0 auto", padding: "45px 18px 55px 18px", minHeight: "100vh" },
  title: { fontSize: 27, fontWeight: 800, color: "#60a5fa", marginBottom: 26, letterSpacing: 0.5, background: "none" },
  card: { background: "linear-gradient(110deg,#111827 70%, #1d4ed822 100%)", borderRadius: 15, boxShadow: "0 8px 36px #1e293b40, 0 2px 8px #2563eb33", border: "1.3px solid #2563eb26", marginBottom: 21, padding: "29px 25px 24px 25px" },
  error: { background: "#3f1d1d", color: "#fecaca", fontWeight: 600, padding: "14px 24px", borderRadius: 8, border: "1.5px solid #f87171", margin: "16px 0 8px", fontSize: 16, textAlign: "center" },
  loading: { color: "#93c5fd", fontSize: 18, padding: 23, textAlign: "center", fontWeight: 500 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 15.5, background: "none" },
  th: { textAlign: "left", color: "#9dc3fa", fontWeight: 700, padding: "12px 7px", borderBottom: "1.5px solid #2563eb32", background: "none" },
  td: { padding: "10px 7px", borderBottom: "1px solid #2563eb21", background: "none" },
  actionBtn: { background: "#2563eb", color: "#fff", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", marginRight: 8 },
  actionBar: { display: "flex", gap: 17, marginTop: 12 },
  cancelBtn: { background: "none", color: "#93c5fd", border: "1.3px solid #2563eb56", borderRadius: 8, fontWeight: 600, fontSize: 16.5, padding: "10px 32px", cursor: "pointer" },
};
