export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';
import { verifyToken } from '@/lib/auth';
import { handleOptions } from '@/lib/cors';

type Candidate = {
  flight_schedule_id: number;
  departure_datetime: string;
  arrival_datetime: string;
  flight_status: string;
  flight_number: number;
  airline_name: string;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
};

export function OPTIONS() {
  return handleOptions();
}

function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.substring(7) || '';
  const user = verifyToken(token);
  return user && user.role === 'Admin' ? user : null;
}

export async function POST(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return errorResponse('Admin access required', 403);

  try {
    const body = await request.json();
    const { flight_schedule_id, window_start_hours, window_end_hours } = body as {
      flight_schedule_id?: number;
      window_start_hours?: number;
      window_end_hours?: number;
    };

    if (!flight_schedule_id) {
      return errorResponse('flight_schedule_id is required', 400);
    }

    const startHrs = Number.isFinite(window_start_hours) ? Number(window_start_hours) : 24;
    const endHrs = Number.isFinite(window_end_hours) ? Number(window_end_hours) : 36;
    if (startHrs < 0 || endHrs <= startHrs) {
      return errorResponse('Invalid window hours. Use window_start_hours < window_end_hours.', 400);
    }

    const source = await queryOne<any>(
      `SELECT 
        fs.flight_schedule_id,
        fs.flight_id,
        fs.departure_datetime,
        fs.arrival_datetime,
        fs.flight_status,
        f.flight_number,
        f.source_airport_id,
        f.destination_airport_id,
        al.airline_name,
        src.airport_code as source_code,
        dest.airport_code as destination_code
      FROM Flight_schedules fs
      JOIN Flights f ON fs.flight_id = f.flight_id
      JOIN Airline al ON f.airline_id = al.airline_id
      JOIN Airport src ON f.source_airport_id = src.airport_id
      JOIN Airport dest ON f.destination_airport_id = dest.airport_id
      WHERE fs.flight_schedule_id = ?`,
      [flight_schedule_id]
    );

    if (!source) return errorResponse('Flight schedule not found', 404);

    if (source.flight_status === 'Cancelled') {
      return successResponse(
        { canConsolidate: false, reason: 'Flight is already cancelled' },
        'Consolidation check completed'
      );
    }
    if (source.flight_status === 'Completed') {
      return successResponse(
        { canConsolidate: false, reason: 'Flight is already completed' },
        'Consolidation check completed'
      );
    }
    if (source.flight_status === 'Departed') {
      return successResponse(
        { canConsolidate: false, reason: 'Flight already departed' },
        'Consolidation check completed'
      );
    }

    const cnt = await queryOne<any>(
      `SELECT COUNT(*) as count
       FROM Tickets
       WHERE flight_schedule_id = ?
         AND status NOT IN ('Cancelled','Moved')`,
      [flight_schedule_id]
    );
    const passengersToMove = Number(cnt?.count || 0);

    if (passengersToMove === 0) {
      return successResponse(
        { canConsolidate: false, passengersToMove, reason: 'No active passengers to move' },
        'Consolidation check completed'
      );
    }

    const candidates = await query<Candidate>(
      `SELECT 
        fs.flight_schedule_id,
        fs.departure_datetime,
        fs.arrival_datetime,
        fs.flight_status,
        f.flight_number,
        al.airline_name,
        (ac.economy_seats + ac.business_seats + ac.first_class_seats) AS total_seats,
        COUNT(t.ticket_id) AS booked_seats,
        ((ac.economy_seats + ac.business_seats + ac.first_class_seats) - COUNT(t.ticket_id)) AS available_seats
      FROM Flight_schedules fs
      JOIN Flights f ON fs.flight_id = f.flight_id
      JOIN Airline al ON f.airline_id = al.airline_id
      JOIN Aircraft ac ON fs.aircraft_id = ac.aircraft_id
      LEFT JOIN Tickets t
        ON t.flight_schedule_id = fs.flight_schedule_id
       AND t.status NOT IN ('Cancelled','Moved')
      WHERE f.source_airport_id = ?
        AND f.destination_airport_id = ?
        AND fs.departure_datetime BETWEEN DATE_ADD(?, INTERVAL ? HOUR) AND DATE_ADD(?, INTERVAL ? HOUR)
        AND fs.flight_status IN ('Scheduled','Boarding')
        AND fs.flight_schedule_id <> ?
      GROUP BY fs.flight_schedule_id
      HAVING available_seats > 0
      ORDER BY available_seats DESC, fs.departure_datetime ASC`,
      [
        source.source_airport_id,
        source.destination_airport_id,
        source.departure_datetime,
        startHrs,
        source.departure_datetime,
        endHrs,
        flight_schedule_id,
      ]
    );

    const totalAvailable = candidates.reduce((sum, c) => sum + Number(c.available_seats || 0), 0);

    let remaining = passengersToMove;
    const plan = candidates.map((c) => ({ ...c, move_passengers: 0 }));

    for (const f of plan) {
      if (remaining <= 0) break;
      const move = Math.min(remaining, Number(f.available_seats || 0));
      f.move_passengers = move;
      remaining -= move;
    }

    const canConsolidate = totalAvailable >= passengersToMove;

    return successResponse(
      {
        canConsolidate,
        flightDetails: {
          flight_schedule_id: source.flight_schedule_id,
          flight_number: source.flight_number,
          airline: source.airline_name,
          departure_datetime: source.departure_datetime,
          route: `${source.source_code} → ${source.destination_code}`,
          current_status: source.flight_status,
        },
        passengersToMove,
        totals: {
          candidateFlights: candidates.length,
          totalAvailableSeats: totalAvailable,
          passengersUnassigned: Math.max(0, remaining),
        },
        plan: plan
          .filter((p) => p.move_passengers > 0)
          .map((p) => ({
            target_flight_schedule_id: p.flight_schedule_id,
            flight_number: p.flight_number,
            airline: p.airline_name,
            departure_datetime: p.departure_datetime,
            available_seats: p.available_seats,
            move_passengers: p.move_passengers,
          })),
        reason: canConsolidate
          ? 'Sufficient seats available collectively across alternative flights'
          : 'Not enough seats available collectively across alternative flights in the selected time window',
      },
      'Consolidation check completed'
    );
  } catch (error: any) {
    console.error('Consolidation check error:', error);
    return errorResponse('Failed to check consolidation: ' + error.message, 500);
  }
}
