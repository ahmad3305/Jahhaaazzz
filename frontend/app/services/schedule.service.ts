
import { API_BASE } from "@/app/config";

export type FlightSchedule = {
  flight_schedule_id: number;
  flight_number: number;
  flight_type: string;
  airline_name: string;
  airline_code: string;
  estimated_duration: string;
  departure_datetime: string;
  arrival_datetime: string;
  registration_number: string;
  model_name: string;
  manufacturer: string;
  source_airport_name: string;
  source_airport_code: string;
  source_city: string;
  destination_airport_name: string;
  destination_airport_code: string;
  destination_city: string;
  gate_number: string;
  terminal_name: string;
  flight_status: string;
  delay_reason?: string | null;
};

export async function getSchedulesByStatus(
  status: string,
  token?: string
): Promise<FlightSchedule[]> {
  const res = await fetch(`${API_BASE}/flight_schedule?flight_status=${encodeURIComponent(status)}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("Non-JSON response from /flight_schedule endpoint");
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.message || "Failed to fetch flight schedules");
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function delaySchedule(
  flight_schedule_id: number,
  delay_reason: string,
  token?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/flight_schedule/${flight_schedule_id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ delay_reason })
  });
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("Non-JSON response");
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.message || "Failed to delay schedule");
  }
}
