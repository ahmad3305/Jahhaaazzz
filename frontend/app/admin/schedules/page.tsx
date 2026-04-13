"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSchedulesByStatus,
  delaySchedule,
  FlightSchedule
} from "@/app/services/schedule.service";

const TAB_STATUSES = [
  { key: "Scheduled", label: "Scheduled" },
  { key: "Delayed", label: "Delayed" },
  { key: "Consolidated", label: "Consolidated" },
];

const DELAY_REASONS = [
  "Technical Issue",
  "Weather Delay",
  "Security Issue",
  "Emergency",
];

export default function SchedulesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Scheduled" | "Delayed" | "Consolidated">("Scheduled");
  const [schedules, setSchedules] = useState<FlightSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [delayModalId, setDelayModalId] = useState<number | null>(null);
  const [delayReason, setDelayReason] = useState("");
  const [delaySubmitting, setDelaySubmitting] = useState(false);
  const [delayError, setDelayError] = useState("");

  useEffect(() => {
    async function fetchSchedules() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token") || "";
        const data = await getSchedulesByStatus(activeTab, token);
        setSchedules(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load schedules.");
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, [activeTab]);

  function openDelayModal(id: number) {
    setDelayModalId(id);
    setDelayError("");
    setDelayReason("");
  }
  function closeDelayModal() {
    setDelayModalId(null);
    setDelayError("");
    setDelayReason("");
  }

  async function handleDelayFlight() {
    if (!delayModalId || !delayReason) {
      setDelayError("Please select a reason.");
      return;
    }
    setDelayError("");
    setDelaySubmitting(true);
    try {
      const token = localStorage.getItem("token") || "";
      await delaySchedule(delayModalId, delayReason, token);
      setSchedules(schedules.filter(s => s.flight_schedule_id !== delayModalId));
      closeDelayModal();
    } catch (e: any) {
      setDelayError(e?.message || "Failed to delay flight.");
    } finally {
      setDelaySubmitting(false);
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <div style={styles.headerBar}>
          <h1 style={styles.title}>✈️ Flight Schedules</h1>
          <button style={styles.createBtn} onClick={() => router.push("/admin/schedules/create")}>
            + Create Schedule
          </button>
        </div>
        <div style={styles.tabsBar}>
          {TAB_STATUSES.map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : undefined),
              }}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div style={styles.loading}>Loading schedules...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Type</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Gate</th>
                  <th>Status</th>
                  {activeTab === "Delayed" && <th>Delay Reason</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === "Delayed" ? 10 : 9} style={{ textAlign: "center", color: "#fca5a5" }}>
                      No {activeTab.toLowerCase()} flights.
                    </td>
                  </tr>
                ) : (
                  schedules.map(s => (
                    <tr key={s.flight_schedule_id}>
                      <td>
                        <span style={{ fontWeight: 700 }}>{s.airline_code}-{s.flight_number}</span>
                        <span style={{ color: "#60a5fa", marginLeft: 7, fontWeight: 500, fontSize: 13 }}>
                          ({s.airline_name})
                        </span>
                      </td>
                      <td>
                        <span style={{
                          background: "#2563eb28",
                          color: "#2563eb",
                          borderRadius: 8,
                          padding: "2px 11px",
                          fontSize: 13.3,
                          fontWeight: 600,
                        }}>
                          {s.flight_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{formatDateTime(s.departure_datetime)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{formatDateTime(s.arrival_datetime)}</div>
                      </td>
                      <td>
                        <div style={styles.cityLabel}>
                          <span style={styles.airportCode}>{s.source_airport_code}</span>{" "}
                          ({s.source_city}) <br />
                          <span style={styles.secondary}>{s.source_airport_name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={styles.cityLabel}>
                          <span style={styles.airportCode}>{s.destination_airport_code}</span>{" "}
                          ({s.destination_city}) <br />
                          <span style={styles.secondary}>{s.destination_airport_name}</span>
                        </div>
                      </td>
                      <td>
                        T: {s.terminal_name}<br />G: {s.gate_number}
                      </td>
                      <td>
                        <span style={{
                          background:
                            s.flight_status === "Scheduled"
                              ? "#22c55e33"
                              : s.flight_status === "Delayed"
                              ? "#fbbf2431"
                              : s.flight_status === "Consolidated"
                              ? "#818cf833"
                              : "#1e293b44",
                          color:
                            s.flight_status === "Scheduled"
                              ? "#22c55e"
                              : s.flight_status === "Delayed"
                              ? "#fbbf24"
                              : s.flight_status === "Consolidated"
                              ? "#6366f1"
                              : "#e6eefb",
                          borderRadius: 8,
                          padding: "2px 11px",
                          fontWeight: 700,
                          fontSize: 13.3,
                        }}>
                          {s.flight_status}
                        </span>
                      </td>
                      {activeTab === "Delayed" && (
                        <td>
                          <span style={{
                            background: "#fbbf241e",
                            color: "#fbbf24",
                            fontWeight: 700,
                            borderRadius: 6,
                            padding: "2px 10px",
                            fontSize: 13,
                          }}>
                            {s.delay_reason || "—"}
                          </span>
                        </td>
                      )}
                      <td>
                        <button
                          style={styles.actionBtn}
                          onClick={() => router.push(`/admin/schedules/${s.flight_schedule_id}/edit`)}
                        >
                          View/Edit
                        </button>
                        {activeTab === "Scheduled" && (
                          <button
                            style={styles.delayBtn}
                            onClick={() => openDelayModal(s.flight_schedule_id)}
                          >
                            Delay Flight
                          </button>
                        )}
                        {activeTab === "Delayed" && s.delay_reason !== "Crew Issue" && (
                          <button
                            style={styles.primaryBtn}
                            onClick={() => router.push(`/admin/schedules/${s.flight_schedule_id}/edit`)}
                          >
                            Reschedule
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {delayModalId && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={{ color: "#60a5fa", fontWeight: 800, fontSize: 22, margin: 0, marginBottom: 16 }}>Delay Flight</h2>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: "#93c5fd", fontSize: 16 }}>Delay Reason</label>
                <select
                  style={styles.input}
                  value={delayReason}
                  onChange={e => setDelayReason(e.target.value)}
                >
                  <option value="">Select reason…</option>
                  {DELAY_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {delayError && <div style={styles.error}>{delayError}</div>}
              <div style={{ display: "flex", gap: 17 }}>
                <button
                  style={styles.primaryBtn}
                  onClick={handleDelayFlight}
                  disabled={delaySubmitting}
                >
                  {delaySubmitting ? "Delaying..." : "Delay"}
                </button>
                <button style={styles.cancelBtn} onClick={closeDelayModal} disabled={delaySubmitting}>
                  Cancel
                </button>
              </div>
            </div>
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
    background: "linear-gradient(140deg, #1e293b 70%, #2563eb 120%)",
    color: "#e6eefb",
    fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    padding: 0,
  },
  shell: {
    maxWidth: 1260,
    margin: "0 auto",
    padding: "40px 18px 55px 18px",
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
  tabsBar: {
    display: "flex",
    gap: 21,
    marginBottom: 12,
    marginTop: 5,
  },
  tab: {
    background: "none",
    color: "#93c5fd",
    border: "none",
    borderBottom: "2.7px solid #1e293b44",
    fontSize: 17.5,
    fontWeight: 700,
    padding: "12px 32px 9px 32px",
    cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "color 0.09s, border-bottom 0.12s",
  },
  tabActive: {
    color: "#2563eb",
    borderBottom: "3.6px solid #2563eb"
  },
  loading: {
    color: "#93c5fd",
    fontSize: 18,
    padding: 28,
    textAlign: "center",
    fontWeight: 500,
    marginTop: 22,
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
    minWidth: 1160,
  },
  airportCode: {
    fontWeight: 800,
    fontSize: 15,
    color: "#60a5fa",
    marginRight: 6,
    letterSpacing: "0.03em",
  },
  secondary: {
    color: "#38bdf8",
    fontSize: 13.2,
    fontWeight: 500,
  },
  cityLabel: {
    lineHeight: 1.25,
    marginBottom: 2,
    marginTop: 2,
  },
  actionBtn: {
    background: "#2563eb",
    color: "#fff",
    borderRadius: 8,
    padding: "7px 17px",
    fontSize: 15,
    fontWeight: 600,
    border: "none",
    marginRight: 5,
    marginTop: 3,
    cursor: "pointer",
    boxShadow: "0 2px 4px #2563eb16",
    transition: "background 0.12s",
  },
  delayBtn: {
    background: "#fbbf24",
    color: "#fff",
    borderRadius: 8,
    padding: "7px 15px",
    fontSize: 15,
    fontWeight: 600,
    border: "none",
    marginTop: 3,
    cursor: "pointer",
    boxShadow: "0 2px 4px #fbbf2416",
    transition: "background 0.12s",
  },
  primaryBtn: {
    background: "linear-gradient(90deg,#2563eb 77%, #0ea5e9)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 16,
    padding: "9px 26px",
    cursor: "pointer",
    boxShadow: "0 2px 8px #2563eb33",
  },
  cancelBtn: {
    background: "none",
    color: "#93c5fd",
    border: "1.3px solid #2563eb56",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 16.5,
    padding: "9px 26px",
    cursor: "pointer"
  },
  modalOverlay: {
    position: "fixed",
    left: 0, top: 0, width: "100vw", height: "100vh",
    background: "rgba(23,39,65,0.66)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center"
  },
  modal: {
    background: "#182033",
    borderRadius: 13,
    padding: 36,
    minWidth: 340, maxWidth: 410,
    position: "relative",
    textAlign: "left" as const,
    boxShadow: "0 4px 32px #222c4888",
  },
  input: {
    background: "#1e293b",
    border: "1.2px solid #2563eb39",
    borderRadius: 7,
    color: "#e6eefb",
    fontSize: 16.5,
    padding: "9px 12px",
    outline: "none",
    width: "100%",
    marginTop: 7,
    fontWeight: 600,
  },
};
