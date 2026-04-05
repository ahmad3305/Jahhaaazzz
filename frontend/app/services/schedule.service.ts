
import { API_BASE } from "@/app/config";

export type CrewRequirement = { role_required: string; number_required: number; };
export type FlightSchedule = {
  flight_schedule_id: number;
  flight_id: number;
  flight_number: number;
  airline_name: string;
  airline_code: string;
  flight_type: string;
  aircraft_id: number;
  registration_number: string;
  gate_id: number;
  gate_number: string;
  terminal_name: string;
  departure_datetime: string;
  arrival_datetime: string;
  source_airport_name: string;
  destination_airport_name: string;
  flight_status: string;
  delay_reason?: string | null;
  crew_requirements?: CrewRequirement[];
};

export type Aircraft = { aircraft_id: number; registration_number: string; status: string };
export type Gate = { gate_id: number; gate_number: string; terminal_name: string };

export async function getScheduleById(
  scheduleId: string | number,
  token?: string
): Promise<FlightSchedule> {
  const res = await fetch(`${API_BASE}/flight_schedule/${scheduleId}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const json = await res.json();
  if (!res.ok || !json.success)
    throw new Error(json.message || "Failed to load schedule");
  return json.data as FlightSchedule;
}

export async function getAircrafts(token?: string): Promise<Aircraft[]> {
  const res = await fetch(`${API_BASE}/aircraft`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to load aircrafts");
  // filter to only "Active"
  return (Array.isArray(json.data) ? json.data : []).filter((a: Aircraft) => a.status === "Active");
}

export async function getGates(token?: string): Promise<Gate[]> {
  const res = await fetch(`${API_BASE}/gates`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to load gates");
  return Array.isArray(json.data) ? json.data : [];
}

export async function updateSchedule(
  scheduleId: string | number,
  body: {
    aircraft_id: number;
    gate_id: number;
    departure_datetime: string;
    arrival_datetime: string;
    crew_requirements: CrewRequirement[];
  },
  token?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/flight_schedule/${scheduleId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success)
    throw new Error(json.message || "Failed to update schedule.");
}
