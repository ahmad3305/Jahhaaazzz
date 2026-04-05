"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/app/config";

type Metrics = {
  totalFlights: number;
  totalSchedules: number;
  totalAircraft: number;
  totalCrew: number;
  totalAirports: number;
  upcomingFlights: number;
  cancelledFlights: number;
  delayedFlights: number;
  completedFlights: number;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token") || "";

        const [
          flightsRes,
          schedulesRes,
          aircraftRes,
          crewRes,
          airportsRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/flights`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/flight_schedule`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/aircraft`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/crew`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/airports`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [flights, schedules, aircraft, crew, airports] = await Promise.all([
          flightsRes.json(),
          schedulesRes.json(),
          aircraftRes.json(),
          crewRes.json(),
          airportsRes.json(),
        ]);

        const scheduleRows = Array.isArray(schedules.data) ? schedules.data : [];
        const now = new Date();

        let upcomingFlights = 0,
          cancelledFlights = 0,
          delayedFlights = 0,
          completedFlights = 0;
        for (const sched of scheduleRows) {
          const status = String(sched.flight_status || "").toLowerCase();
          if (status === "cancelled") cancelledFlights++;
          else if (status === "delayed") delayedFlights++;
          else if (status === "completed") completedFlights++;
          else if (new Date(sched.departure_datetime) > now && status !== "completed") upcomingFlights++;
        }

        setMetrics({
          totalFlights: Array.isArray(flights.data) ? flights.data.length : 0,
          totalSchedules: scheduleRows.length,
          totalAircraft: Array.isArray(aircraft.data) ? aircraft.data.length : 0,
          totalCrew: Array.isArray(crew.data) ? crew.data.length : 0,
          totalAirports: Array.isArray(airports.data) ? airports.data.length : 0,
          upcomingFlights,
          cancelledFlights,
          delayedFlights,
          completedFlights,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <h1 style={styles.title}>🛫 Admin Dashboard</h1>
        <p style={styles.subtitle}>
          Monitor your airport’s live data, operations, and resources at a glance.
        </p>

        {loading ? (
          <div style={styles.loading}>Loading dashboard data...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : metrics ? (
          <div style={styles.grid}>
            <StatCard
              label="Total Flights"
              value={metrics.totalFlights}
              accent="#60a5fa"
              onClick={() => router.push("/(admin)/flights")}
              icon="🛩️"
            />
            <StatCard
              label="Total Schedules"
              value={metrics.totalSchedules}
              accent="#06d6a0"
              onClick={() => router.push("/(admin)/schedules")}
              icon="📅"
            />
            <StatCard
              label="Upcoming Flights"
              value={metrics.upcomingFlights}
              accent="#84cc16"
              onClick={() => router.push("/(admin)/schedules")}
              icon="⏰"
            />
            <StatCard
              label="Delayed Flights"
              value={metrics.delayedFlights}
              accent="#fbbf24"
              onClick={() => router.push("/(admin)/schedules/delayed")}
              icon="⏳"
            />
            <StatCard
              label="Cancelled Flights"
              value={metrics.cancelledFlights}
              accent="#f87171"
              onClick={() => router.push("/(admin)/schedules")}
              icon="❌"
            />
            <StatCard
              label="Completed Flights"
              value={metrics.completedFlights}
              accent="#38bdf8"
              onClick={() => router.push("/(admin)/schedules")}
              icon="✅"
            />
            <StatCard
              label="Total Aircraft"
              value={metrics.totalAircraft}
              accent="#f472b6"
              onClick={() => router.push("/(admin)/aircraft")}
              icon="✈️"
            />
            <StatCard
              label="Total Crew"
              value={metrics.totalCrew}
              accent="#c084fc"
              onClick={() => router.push("/(admin)/crew")}
              icon="👨‍✈️"
            />
            <StatCard
              label="Airports"
              value={metrics.totalAirports}
              accent="#fca5a5"
              onClick={() => router.push("/(admin)/airports")}
              icon="🛬"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  onClick,
  icon,
}: {
  label: string;
  value: number;
  accent?: string;
  onClick?: () => void;
  icon?: string;
}) {
  return (
    <div
      style={{
        ...styles.card,
        borderTop: `4px solid ${accent || "#2563eb"}`,
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
      tabIndex={onClick ? 0 : -1}
      aria-label={label}
    >
      <div style={{ fontSize: 39, marginBottom: 7 }}>{icon}</div>
      <div style={{ fontSize: 17, color: accent || "#60a5fa", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, color: "#e2e8f0", fontWeight: 800, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(140deg, #1e293b 70%, #2563eb 130%)",
    color: "#e6eefb",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    padding: 0,
  },
  shell: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 18px 55px 18px",
    minHeight: "100vh",
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: "#60a5fa",
    marginBottom: 8,
    background: "none",
    letterSpacing: 0.7,
  },
  subtitle: {
    color: "#93c5fd",
    fontSize: 17,
    marginBottom: 26,
    marginTop: 6,
    fontStyle: "italic",
    background: "none",
  },
  error: {
    background: "#3f1d1d",
    color: "#fecaca",
    fontWeight: 600,
    padding: "18px 28px",
    borderRadius: 10,
    border: "1.5px solid #f87171",
    margin: "26px 0",
    fontSize: 17,
  },
  loading: {
    color: "#93c5fd",
    fontSize: 18,
    padding: 22,
    textAlign: "center",
    fontWeight: 500,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
    gap: 24,
    marginTop: 15,
    marginBottom: 20,
  },
  card: {
    background: "linear-gradient(110deg,#1e293b, #2563eb0c)",
    borderRadius: 16,
    border: "1.3px solid #2563eb26",
    padding: "28px 16px",
    minHeight: 120,
    display: "flex",
    alignItems: "flex-start",
    flexDirection: "column",
    boxShadow: "0 2px 12px #2563eb22, 0 8px 36px #1e293b25",
    transition: "transform 0.1s",
    outline: "none",
  }
};
