"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSchedulesByStatus, FlightSchedule } from "@/app/services/schedule.service";

export default function DelayedSchedulesPage() {
  const [schedules, setSchedules] = useState<FlightSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchDelayedSchedules() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token") || "";
        const data = await getSchedulesByStatus("Delayed", token);
        setSchedules(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load delayed schedules.");
      } finally {
        setLoading(false);
      }
    }
    fetchDelayedSchedules();
  }, []);

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <h1 style={styles.title}>⏰ Delayed Flight Schedules</h1>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Gate</th>
                  <th>Delay Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "#fca5a5" }}>
                      No delayed flights found.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.flight_schedule_id}>
                      <td>
                        <span style={{ fontWeight: 700 }}>{s.airline_code}-{s.flight_number}</span>
                        <span style={{ color: "#60a5fa", marginLeft: 7, fontWeight: 500, fontSize: 13 }}>
                          ({s.airline_name})
                        </span>
                      </td>
                      <td>
                        <span style={styles.typeBadge}>
                          {s.flight_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{formatDateTime(s.departure_datetime)}</div>
                      </td>
                      <td>
                        <div style={styles.cityLabel}>
                          <span style={styles.airportCode}>{s.source_airport_code}</span>{" "}
                          ({s.source_city})<br />
                          <span style={styles.secondary}>{s.source_airport_name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={styles.cityLabel}>
                          <span style={styles.airportCode}>{s.destination_airport_code}</span>{" "}
                          ({s.destination_city})<br />
                          <span style={styles.secondary}>{s.destination_airport_name}</span>
                        </div>
                      </td>
                      <td>
                        T: {s.terminal_name}<br />G: {s.gate_number}
                      </td>
                      <td>
                        <span style={styles.delayBadge}>
                          {s.delay_reason || "—"}
                        </span>
                      </td>
                      <td>
                        <span style={styles.delayedStatusBadge}>
                          {s.flight_status}
                        </span>
                      </td>
                      <td>
                        {s.delay_reason !== "Crew Issue" ? (
                          <button
                            style={styles.rescheduleBtn}
                            onClick={() => router.push(`/(admin)/schedules/${s.flight_schedule_id}/edit`)}
                          >
                            Reschedule
                          </button>
                        ) : (
                          <span style={styles.autoLabel}>Auto-Rescheduled</span>
                        )}
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
    background: "linear-gradient(140deg, #1e293b 70%, #2563eb 120%)",
    color: "#e6eefb",
    fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    padding: 0,
  },
  shell: {
    maxWidth: 1250,
    margin: "0 auto",
    padding: "40px 18px 65px 18px",
    minHeight: "100vh",
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: "#60a5fa",
    margin: "0 0 22px 0",
    letterSpacing: 0.5,
    background: "none",
  },
  loading: {
    color: "#93c5fd",
    fontSize: 18,
    padding: 24,
    textAlign: "center",
    fontWeight: 500,
  },
  error: {
    background: "#3f1d1d",
    color: "#fecaca",
    fontWeight: 600,
    padding: "14px 24px",
    borderRadius: 8,
    border: "1.5px solid #f87171",
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
  typeBadge: {
    background: "#2563eb28",
    color: "#2563eb",
    borderRadius: 8,
    padding: "2px 11px",
    fontSize: 13.3,
    fontWeight: 600,
  },
  delayBadge: {
    background: "#fbbf241e",
    color: "#fbbf24",
    fontWeight: 700,
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 13,
  },
  delayedStatusBadge: {
    background: "#fbbf2431",
    color: "#fbbf24",
    borderRadius: 8,
    padding: "2px 11px",
    fontWeight: 700,
    fontSize: 13.3,
  },
  rescheduleBtn: {
    background: "linear-gradient(90deg,#2563eb 77%, #0ea5e9)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 15.5,
    padding: "9px 24px",
    cursor: "pointer",
    marginBottom: 3,
    marginTop: 2,
    boxShadow: "0 2px 7px #2563eb19",
  },
  autoLabel: {
    color: "#93c5fd",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.2,
    opacity: 0.7,
  },
};
