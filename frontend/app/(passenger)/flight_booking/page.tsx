"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

export default function FlightBookingPage() {
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    // The correct endpoint: "flight-schedules" (hyphen, not underscore or singular)
    fetch(`${API_BASE}/flight-schedules`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(r => r.json())
      .then(r => setFlights(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError("Failed to load flights"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <h1 style={styles.title}>Book Upcoming Flights</h1>
        <p style={styles.info}>
          All flights (Scheduled, Delayed, Cancelled, except Completed) are listed below.
          To book, click the "Book" button for your desired flight.
        </p>
        {loading ? (
          <AestheticCard>
            <div>Loading flights...</div>
          </AestheticCard>
        ) : error ? (
          <AestheticCard style={styles.error}>{error}</AestheticCard>
        ) : flights.length === 0 ? (
          <AestheticCard>
            <div style={{ textAlign: "center" }}>No upcoming flights found.</div>
          </AestheticCard>
        ) : (
          <AestheticCard noPad>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.tableExpanded}>
                <thead>
                  <tr>
                    <th>Airline</th>
                    <th>Flight No.</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Scheduled Date</th>
                    <th>Duration</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((flight, idx) => {
                    const status = flight.flight_status ?? "Scheduled";
                    const isCancelled = status.toLowerCase() === "cancelled";
                    return (
                      <tr key={flight.flight_schedule_id || idx}>
                        <td>
                          <span style={{ fontWeight: 700 }}>
                            {flight.airline_name || "—"}
                          </span>{" "}
                          <span style={{
                            color: "#60a5fa",
                            fontWeight: 500,
                            fontSize: 13,
                            marginLeft: 5
                          }}>
                            ({flight.airline_code || "—"})
                          </span>
                        </td>
                        <td>{flight.flight_number ?? "—"}</td>
                        <td>
                          <span>{flight.source_airport_name || "—"}</span>
                          <div style={{ fontSize: 12, color: "#60a5fa" }}>
                            {flight.source_city}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {flight.source_airport_code}
                          </div>
                        </td>
                        <td>
                          <span>{flight.destination_airport_name || "—"}</span>
                          <div style={{ fontSize: 12, color: "#60a5fa" }}>
                            {flight.destination_city}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {flight.destination_airport_code}
                          </div>
                        </td>
                        <td>
                          {flight.departure_datetime
                            ? new Date(flight.departure_datetime).toLocaleString()
                            : "—"}
                        </td>
                        <td>{flight.estimated_duration ?? "—"}</td>
                        <td>
                          <span style={{
                            background: "#2563eb28",
                            color: "#2563eb",
                            borderRadius: 8,
                            padding: "2px 11px",
                            fontSize: 13.3,
                            fontWeight: 600,
                          }}>
                            {flight.flight_type ?? "—"}
                          </span>
                        </td>
                        <td>
                          <span style={statusBadge(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td>
                          {flight.created_at
                            ? new Date(flight.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          <button
                            style={isCancelled ? styles.bookBtnDisabled : styles.bookBtn}
                            disabled={isCancelled}
                            onClick={() => {
                              if (!isCancelled) 
                                router.push(`/flight_booking/checkout?flight_schedule_id=${flight.flight_schedule_id}`);
                            }}
                          >
                            Book
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AestheticCard>
        )}
      </div>
      <style>
        {`
          table th, table td {
            padding: 18px 22px !important;
            text-align: left;
            vertical-align: middle;
          }
          table th {
            border-bottom: 2px solid #2563eb33;
            font-size: 16.3px;
            font-weight: 700;
            letter-spacing: 0.6px;
            color: #60a5fa;
            background: #1e293b44;
          }
          table tr {
            background: #23304a77;
            border-radius: 13px;
            margin-bottom: 7px;
            box-shadow: 0 2px 8px #2563eb18;
          }
          table tr:not(:last-child) {
            border-bottom: 1px solid #2563eb22;
          }
        `}
      </style>
    </div>
  );
}

// --- COMPONENTS ---

function AestheticCard({
  children,
  style,
  noPad,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  noPad?: boolean;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(110deg, #1e293b 70%, #2563eb18 100%)",
        borderRadius: 14,
        padding: noPad ? 0 : 22,
        boxShadow: "0 8px 36px #1e293b40, 0 2px 8px #2563eb33",
        border: "1.5px solid #2563eb26",
        marginBottom: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function statusBadge(status: string) {
  status = status?.toLowerCase?.() || "";
  let bg = "#60a5facc";
  let color = "#17315a";
  if (status === "confirmed" || status === "scheduled") {
    bg = "#22c55ecc";
    color = "#073c19";
  }
  if (status === "cancelled") {
    bg = "#f87171cc";
    color = "#75030c";
  }
  if (status === "pending" || status === "delayed") {
    bg = "#fbbf24cc";
    color = "#543c11";
  }
  return {
    background: bg,
    color,
    borderRadius: 9,
    padding: "2.5px 14px",
    fontSize: 14,
    fontWeight: 650,
    letterSpacing: 0.3,
    textTransform: "capitalize" as const,
    border: "none",
    outline: "none",
    boxShadow: "0 1px 6px #1117"
  };
}

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(140deg, #1e293b 70%, #2563eb 120%)",
    color: "#e6eefb",
    padding: 0,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  shell: {
    maxWidth: 1290,
    margin: "0 auto",
    padding: "40px 12px 60px 12px",
    minHeight: "100vh",
  },
  title: {
    fontSize: 31,
    fontWeight: 800,
    color: "#60a5fa",
    marginBottom: 8,
    background: "none"
  },
  info: {
    color: "#60a5fa",
    fontSize: 16.5,
    marginBottom: 20,
    marginTop: 0,
    fontStyle: "italic",
    background: "none",
  },
  tableExpanded: {
    width: "100%",
    background: "none",
    borderRadius: 17,
    borderCollapse: "separate",
    borderSpacing: "0 0.4rem",
    fontSize: 17.4,
    color: "#dde7fa",
    marginBottom: 0,
    marginTop: 0,
    minWidth: 1400,
    boxShadow: "none"
  },
  bookBtn: {
    border: "none",
    background: "linear-gradient(90deg,#2563eb 80%, #0ea5e9)",
    color: "#fff",
    padding: "8px 23px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 17,
    boxShadow: "0 2px 8px #2563eb33",
    outline: "none",
    transition: "background 0.1s",
  },
  bookBtnDisabled: {
    border: "none",
    background: "#64748b",
    color: "#a9adc7",
    padding: "8px 23px",
    borderRadius: 9,
    cursor: "not-allowed",
    fontWeight: 700,
    fontSize: 17,
    boxShadow: "0 2px 5px #1e293b21",
    opacity: 0.62,
    transition: "background 0.2s",
  },
  error: {
    color: "#f26a6a",
    background: "#271e1e2b",
    border: "1px solid #b91c1ccc",
    fontWeight: 600,
  },
};