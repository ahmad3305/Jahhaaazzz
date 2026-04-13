"use client";

import React, { useEffect, useState } from "react";
import { getAllStaff, getAllShifts, Staff, Shift } from "@/app/services/crew.service";
import { useRouter } from "next/navigation";

export default function CrewPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token") || "";
        const [staffData, shiftData] = await Promise.all([
          getAllStaff(token),
          getAllShifts(token)
        ]);
        setStaff(staffData);
        setShifts(shiftData);
      } catch (e: any) {
        setError(e?.message || "Failed to load staff or shifts.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const shiftsByStaff: Record<number, Shift[]> = {};
  shifts.forEach(shift => {
    if (!shiftsByStaff[shift.staff_id]) shiftsByStaff[shift.staff_id] = [];
    shiftsByStaff[shift.staff_id].push(shift);
  });

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <div style={styles.headerBar}>
          <h1 style={styles.title}>👨‍✈️ Crew Directory</h1>
          <button style={styles.createBtn} onClick={() => router.push("/admin/staff/create")}>
            + Add Staff
          </button>
        </div>
        <p style={styles.info}>
          List of all crew/staff members and their upcoming shifts.
        </p>
        {loading ? (
          <div style={styles.loading}>Loading staff...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Upcoming Shifts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#fca5a5" }}>
                      No crew/staff found.
                    </td>
                  </tr>
                ) : (
                  staff.map(s => (
                    <tr key={s.staff_id}>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td>{s.email}</td>
                      <td>
                        <span style={styles.roleBadge}>{s.role}</span>
                      </td>
                      <td>{s.phone ?? "—"}</td>
                      <td>
                        <span style={s.status === "Active" ? styles.activeStatus : styles.inactiveStatus}>
                          {s.status || "Active"}
                        </span>
                      </td>
                      <td>
                        {shiftsByStaff[s.staff_id]?.length > 0 ? (
                          <ul style={styles.shiftList}>
                            {shiftsByStaff[s.staff_id]
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))
                              .slice(0, 2)
                              .map(shift => (
                                <li key={shift.shift_id}>
                                  <span style={{ fontWeight: 600 }}>
                                    {formatDateTime(shift.start_time)}
                                    {" - "}
                                    {formatDateTime(shift.end_time)}
                                  </span>
                                  <span style={{ color: "#38bdf8", fontSize: 13, marginLeft: 8 }}>
                                    {shift.role}
                                  </span>
                                </li>
                              ))}
                            {shiftsByStaff[s.staff_id].length > 2 && (
                              <li style={{ color: "#6ee7b7" }}>+ {shiftsByStaff[s.staff_id].length - 2} more</li>
                            )}
                          </ul>
                        ) : (
                          <span style={{color:"#64748b", fontSize:13}}>No upcoming shifts</span>
                        )}
                      </td>
                      <td>
                        <button
                          style={styles.actionBtn}
                          onClick={() => router.push(`/admin/staff/${s.staff_id}/edit`)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(dt: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(140deg, #1e293b 70%, #2563eb 110%)",
    color: "#e6eefb",
    fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    padding: 0,
  },
  shell: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 18px 65px 18px",
    minHeight: "100vh",
  },
  headerBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: "#60a5fa",
    margin: 0,
    letterSpacing: 0.5,
    background: "none",
  },
  createBtn: {
    padding: "8px 25px",
    background: "linear-gradient(90deg,#2563eb 75%, #0ea5e9)",
    border: "none",
    color: "#fff",
    borderRadius: 9,
    fontWeight: 700,
    fontSize: 17,
    boxShadow: "0 2px 8px #2563eb33",
    cursor: "pointer",
    transition: "background 0.12s",
  },
  info: {
    color: "#93c5fd",
    fontSize: 16.5,
    marginBottom: 13,
    fontStyle: "italic",
    background: "none",
  },
  loading: {
    color: "#93c5fd",
    fontSize: 18,
    padding: 28,
    textAlign: "center",
    fontWeight: 500,
  },
  error: {
    background: "#3f1d1d",
    color: "#fecaca",
    fontWeight: 600,
    padding: "14px 24px",
    borderRadius: 8,
    border: "1.6px solid #f87171",
    margin: "18px 0 13px",
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    background: "linear-gradient(110deg, #111827 70%, #1d4ed822 100%)",
    borderRadius: 15,
    boxShadow: "0 8px 36px #1e293b40, 0 2px 8px #2563eb33",
    border: "1.3px solid #2563eb26",
    marginBottom: 18,
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 0.2rem",
    fontSize: 16.6,
    color: "#dde7fa",
    background: "none",
    minWidth: 950,
  },
  roleBadge: {
    background: "#2563eb28",
    color: "#2563eb",
    borderRadius: 8,
    padding: "2px 11px",
    fontSize: 13.3,
    fontWeight: 600,
  },
  activeStatus: {
    background: "#22c55e33",
    color: "#22c55e",
    borderRadius: 8,
    padding: "2px 10px",
    fontWeight: 700,
    fontSize: 13,
  },
  inactiveStatus: {
    background: "#f87171cc",
    color: "#fff",
    borderRadius: 8,
    padding: "2px 10px",
    fontWeight: 700,
    fontSize: 13,
  },
  shiftList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.5,
  },
  actionBtn: {
    background: "#2563eb",
    color: "#fff",
    borderRadius: 8,
    padding: "7px 17px",
    fontSize: 15,
    fontWeight: 600,
    border: "none",
    marginTop: 3,
    cursor: "pointer",
    boxShadow: "0 2px 4px #2563eb16",
    transition: "background 0.12s",
  },
};
