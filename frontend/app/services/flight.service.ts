import { API_BASE } from "@/app/config";

export type Flight = {
  flight_id: number;
  airline_name: string;
  airline_code: string;
  flight_number: number;
  flight_type: string;
  estimated_duration: string;
  source_airport_name: string;
  source_airport_code: string;
  source_city: string;
  source_country: string;
  destination_airport_name: string;
  destination_airport_code: string;
  destination_city: string;
  destination_country: string;
};

export async function getAllFlights(token?: string): Promise<Flight[]> {
  const res = await fetch(`${API_BASE}/flights`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("Non-JSON response from /flights endpoint");
  }

  if (!res.ok || json.success === false) {
    throw new Error(json.message || "Failed to fetch flights");
  }

  return Array.isArray(json.data) ? json.data : [];
}
