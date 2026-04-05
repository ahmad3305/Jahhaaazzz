"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/app/config";

type Flight = {
  flight_id: number;
  flight_number: number;
  airline_name: string;
  airline_code: string;
  source_airport_name: string;
  destination_airport_name: string;
};
type Aircraft = {
  aircraft_id: number;
  registration_number: string;
  status: string;
};
type Gate = {
  gate_id: number;
  gate_number: string;
  terminal_name: string;
};
type CrewRequirement = {
  role_required: string;
  number_required: number;
};

const CREW_ROLES = [
  "Pilot",
  "Co-Pilot",
  "Cabin Crew",
  "Check-in Staff",
  "Boarding Staff",
  "Baggage Handler",
  "Ramp Operator",
  "Maintenance Crew",
  "Supervisor",
];

export default function CreateSchedulePage() {
  const router = useRouter();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [flight_id, setFlightId] = useState<number | "">("");
  const [aircraft_id, setAircraftId] = useState<number | "">("");
  const [gate_id, setGateId] = useState<number | "">("");
  const [departure_datetime, setDepartureDateTime] = useState("");
  const [arrival_datetime, setArrivalDateTime] = useState("");
  const [crew_requirements, setCrewRequirements] = useState<CrewRequirement[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token") || "";
        const [flRes, acRes, gateRes] = await Promise.all([
          fetch(`${API_BASE}/flights`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/aircraft`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/gates`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [flightsJson, aircraftJson, gatesJson] = await Promise.all([
          flRes.json(), acRes.json(), gateRes.json()
        ]);
        setFlights(Array.isArray(flightsJson.data) ? flightsJson.data : []);
        setAircraft(Array.isArray(aircraftJson.data) ? aircraftJson.data.filter((a: Aircraft) => a.status === "Active") : []);
        setGates(Array.isArray(gatesJson.data) ? gatesJson.data : []);
      } catch (e: any) {
        setError("Failed to load flights, aircraft, or gates. " + (e?.message || ""));
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  // Crew requirements UI handlers
  function addCrewRow() {
    setCrewRequirements([
      ...crew_requirements,
      { role_required: CREW_ROLES[0], number_required: 1 },
    ]);
  }
  function updateCrewRow(idx: number, key: keyof CrewRequirement, value: string | number) {
    setCrewRequirements(
      crew_requirements.map((c, i) => i === idx ? { ...c, [key]: value } : c)
    );
  }
  function removeCrewRow(idx: number) {
    setCrewRequirements(crew_requirements.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setValidationErrors([]);

    const errs: string[] = [];
    if (!flight_id) errs.push("Flight is required.");
    if (!aircraft_id) errs.push("Aircraft is required.");
    if (!gate_id) errs.push("Gate is required.");
    if (!departure_datetime) errs.push("Departure time is required.");
    if (!arrival_datetime) errs.push("Arrival time is required.");
    if (new Date(arrival_datetime) <= new Date(departure_datetime))
      errs.push("Arrival must be after departure.");
    if (!crew_requirements.length)
      errs.push("At least one crew requirement is required.");
    for (const [i, cr] of crew_requirements.entries()) {
      if (!cr.role_required) errs.push(`Crew row ${i + 1}: Role is required.`);
      if (!cr.number_required || cr.number_required < 1)
        errs.push(`Crew row ${i + 1}: Number must be > 0.`);
    }
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/flight_schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flight_id,
          aircraft_id,
          gate_id,
          departure_datetime,
          arrival_datetime,
          crew_requirements,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (Array.isArray(json.errors)) setValidationErrors(json.errors);
        else setError(json.message || "Failed to create schedule.");
        return;
      }
      router.push(`/(admin)/schedules/${json.data.flight_schedule_id}/edit`);
    } catch (e: any) {
      setError(e?.message || "Failed to create schedule.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.shell}>
        <h1 style={styles.title}>📅 Create Flight Schedule</h1>
        <div style={styles.card}>
          {loading ? (
            <div style={styles.loading}>Loading data...</div>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form}>
              {error && <div style={styles.error}>{error}</div>}
              {validationErrors.length > 0 && (
                <div style={styles.errorList}>
                  {validationErrors.map((e, i) => (
                    <div key={i}>• {e}</div>
                  ))}
                </div>
              )}
              <div style={styles.fieldsGrid}>
                <div style={styles.labelGroup}>
                  <label style={styles.label}>Flight</label>
                  <select
                    value={flight_id}
                    style={styles.select}
                    onChange={e => setFlightId(Number(e.target.value))}
                    required
                  >
                    <option value="">Select...</option>
                    {flights.map(f => (
                      <option key={f.flight_id} value={f.flight_id}>
                        {f.airline_code}-{f.flight_number}: {f.source_airport_name} ➔ {f.destination_airport_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.labelGroup}>
                  <label style={styles.label}>Aircraft</label>
                  <select
                    value={aircraft_id}
                    style={styles.select}
                    onChange={e => setAircraftId(Number(e.target.value))}
                    required
                  >
                    <option value="">Select...</option>
                    {aircraft.map(a => (
                      <option key={a.aircraft_id} value={a.aircraft_id}>
                        {a.registration_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.labelGroup}>
                  <label style={styles.label}>Gate</label>
                  <select
                    value={gate_id}
                    style={styles.select}
                    onChange={e => setGateId(Number(e.target.value))}
                    required
                  >
                    <option value="">Select...</option>
                    {gates.map(g => (
                      <option key={g.gate_id} value={g.gate_id}>
                        {g.terminal_name} - {g.gate_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.labelGroup}>
                  <label style={styles.label}>Departure DateTime</label>
                  <input
                    style={styles.input}
                    type="datetime-local"
                    value={departure_datetime}
                    onChange={e => setDepartureDateTime(e.target.value)}
                    required
                  />
                </div>
                <div style={styles.labelGroup}>
                  <label style={styles.label}>Arrival DateTime</label>
                  <input
                    style={styles.input}
                    type="datetime-local"
                    value={arrival_datetime}
                    onChange={e => setArrivalDateTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <label style={{ ...styles.label, fontSize: 16.5, marginBottom: 9 }}>
                  Crew Requirements
                  <span
                    style={{
                      color: "#60a5fa",
                      fontWeight: 400,
                      fontSize: 15,
                      marginLeft: 7,
                      cursor: "pointer",
                    }}
                    onClick={addCrewRow}
                  >
                    [+ Add]
                  </span>
                </label>
                <table style={styles.crewTable}>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Number Required</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {crew_requirements.map((cr, i) => (
                      <tr key={i}>
                        <td>
                          <select
                            style={styles.crewSelect}
                            value={cr.role_required}
                            onChange={e =>
                              updateCrewRow(i, "role_required", e.target.value)
                            }
                          >
                            {CREW_ROLES.map(r => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            min={1}
                            value={cr.number_required}
                            onChange={e =>
                              updateCrewRow(i, "number_required", Number(e.target.value))
                            }
                            required
                          />
                        </td>
                        <td>
                          <button
                            style={styles.xBtn}
                            type="button"
                            onClick={() => removeCrewRow(i)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {crew_requirements.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: "#a4aabb", padding: 9, textAlign: "center" }}>
                          Click <b>+ Add</b> to add a crew role
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={styles.actionBar}>
                <button
                  type="submit"
                  style={styles.submitBtn}
                  disabled={submitting || loading}
                >
                  {submitting ? "Creating..." : "Create Schedule"}
                </button>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => router.push("/(admin)/schedules")}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
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
    maxWidth: 720,
    margin: "0 auto",
    padding: "45px 18px 55px 18px",
    minHeight: "100vh",
  },
  title: {
    fontSize: 29,
    fontWeight: 800,
    color: "#60a5fa",
    marginBottom: 26,
    letterSpacing: 0.5,
    background: "none",
  },
  card: {
    background: "linear-gradient(110deg,#111827 70%, #1d4ed822 100%)",
    borderRadius: 15,
    boxShadow: "0 8px 36px #1e293b40, 0 2px 8px #2563eb33",
    border: "1.3px solid #2563eb26",
    marginBottom: 21,
    padding: "33px 25px 19px 25px",
  },
  loading: {
    color: "#93c5fd",
    fontSize: 18,
    padding: 23,
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
    margin: "16px 0 8px",
    fontSize: 16,
    textAlign: "center",
  },
  errorList: {
    background: "#3f1d1d",
    color: "#fecaca",
    fontWeight: 600,
    fontSize: 15.5,
    padding: "10px 18px",
    borderRadius: 10,
    border: "1.2px solid #f87171",
    margin: "13px 0 11px",
    lineHeight: 1.8,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px 20px",
    marginBottom: 7,
  },
  labelGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    color: "#93c5fd",
    fontWeight: 500,
    fontSize: 15.8,
    marginBottom: -2,
  },
  input: {
    background: "#1e293b",
    border: "1.2px solid #2563eb39",
    borderRadius: 7,
    color: "#e6eefb",
    fontSize: 16.5,
    padding: "9px 12px",
    outline: "none",
  },
  select: {
    background: "#1e293b",
    border: "1.2px solid #2563eb39",
    borderRadius: 7,
    color: "#e6eefb",
    fontSize: 16.5,
    padding: "9px 12px",
    outline: "none",
    appearance: "none" as "none",
  },
  crewTable: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    background: "none",
    marginTop: 8,
  },
  crewSelect: {
    background: "#1e293b",
    border: "1.1px solid #2563eb39",
    borderRadius: 7,
    color: "#e6eefb",
    fontSize: 15.7,
    padding: "7px 12px",
    outline: "none",
  },
  xBtn: {
    background: "#f87171",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    fontWeight: 700,
    fontSize: 23,
    padding: "2px 12px 2px 12px",
    marginLeft: 2,
    marginTop: 2,
    cursor: "pointer",
    boxShadow: "0 2px 5px #f8717110",
    lineHeight: "18px",
  },
  actionBar: {
    display: "flex",
    gap: 17,
    marginTop: 24,
  },
  submitBtn: {
    background: "linear-gradient(90deg,#2563eb 77%, #0ea5e9)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    fontWeight: 700,
    fontSize: 16.5,
    padding: "10px 33px",
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
    padding: "10px 32px",
    cursor: "pointer"
  },
};
