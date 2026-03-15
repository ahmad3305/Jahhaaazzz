export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/response';
import { verifyToken } from '@/lib/auth';
import mysql from 'mysql2/promise';

type Candidate = {
  flight_schedule_id: number;
  departure_datetime: string;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
};

function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.substring(7) || '';
  const user = verifyToken(token);
  return user && user.role === 'Admin' ? user : null;
}

class MaxHeap<T> {
  private a: T[] = [];
  constructor(private score: (x: T) => number) {}
  size() { return this.a.length; }
  push(x: T) {
    this.a.push(x);
    this.bubbleUp(this.a.length - 1);
  }
  pop(): T | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  private bubbleUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.score(this.a[p]) >= this.score(this.a[i])) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  private bubbleDown(i: number) {
    const n = this.a.length;
    while (true) {
      let best = i;
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      if (l < n && this.score(this.a[l]) > this.score(this.a[best])) best = l;
      if (r < n && this.score(this.a[r]) > this.score(this.a[best])) best = r;
      if (best === i) break;
      [this.a[i], this.a[best]] = [this.a[best], this.a[i]];
      i = best;
    }
  }
}

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Jahhaazz',
  });
}

export async function POST(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return errorResponse('Admin access required', 403);

  let connection: mysql.Connection | undefined;

  try {
    const body = await request.json();
    const {
      source_flight_schedule_id,
      reason,
      window_start_hours,
      window_end_hours,
    } = body as {
      source_flight_schedule_id?: number;
      reason?: string;
      window_start_hours?: number;
      window_end_hours?: number;
    };

    if (!source_flight_schedule_id) {
      return errorResponse('source_flight_schedule_id is required', 400);
    }

    const startHrs = Number.isFinite(window_start_hours) ? Number(window_start_hours) : 24;
    const endHrs = Number.isFinite(window_end_hours) ? Number(window_end_hours) : 36;
    if (startHrs < 0 || endHrs <= startHrs) {
      return errorResponse('Invalid window hours. Use window_start_hours < window_end_hours.', 400);
    }

    connection = await getConnection();
    await connection.beginTransaction();

    const [sourceRows] = await connection.execute(
      `SELECT 
        fs.flight_schedule_id,
        fs.flight_id,
        fs.departure_datetime,
        fs.flight_status,
        f.flight_number,
        f.source_airport_id,
        f.destination_airport_id
      FROM Flight_schedules fs
      JOIN Flights f ON fs.flight_id = f.flight_id
      WHERE fs.flight_schedule_id = ?
      FOR UPDATE`,
      [source_flight_schedule_id]
    );
    const source = (sourceRows as any[])[0];
    if (!source) {
      await connection.rollback();
      return errorResponse('Source flight schedule not found', 404);
    }
    if (source.flight_status === 'Cancelled') {
      await connection.rollback();
      return errorResponse('Source flight is already cancelled', 400);
    }
    if (source.flight_status === 'Completed') {
      await connection.rollback();
      return errorResponse('Cannot consolidate completed flight', 400);
    }
    if (source.flight_status === 'Departed') {
      await connection.rollback();
      return errorResponse('Cannot consolidate departed flight', 400);
    }

    const [ticketRows] = await connection.execute(
      `SELECT ticket_id
       FROM Tickets
       WHERE flight_schedule_id = ?
         AND status NOT IN ('Cancelled','Moved')
       ORDER BY ticket_id ASC
       FOR UPDATE`,
      [source_flight_schedule_id]
    );
    const tickets = (ticketRows as any[]).map((r) => Number(r.ticket_id));
    if (tickets.length === 0) {
      await connection.rollback();
      return errorResponse('Source flight has no active passengers', 400);
    }

    const [candidateRows] = await connection.execute(
      `SELECT 
        fs.flight_schedule_id,
        fs.departure_datetime,
        (ac.economy_seats + ac.business_seats + ac.first_class_seats) AS total_seats,
        COUNT(t.ticket_id) AS booked_seats,
        ((ac.economy_seats + ac.business_seats + ac.first_class_seats) - COUNT(t.ticket_id)) AS available_seats
      FROM Flight_schedules fs
      JOIN Flights f ON fs.flight_id = f.flight_id
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
      FOR UPDATE`,
      [
        source.source_airport_id,
        source.destination_airport_id,
        source.departure_datetime,
        startHrs,
        source.departure_datetime,
        endHrs,
        source_flight_schedule_id,
      ]
    );

    const candidates: Candidate[] = (candidateRows as any[]).map((r) => ({
      flight_schedule_id: Number(r.flight_schedule_id),
      departure_datetime: r.departure_datetime,
      total_seats: Number(r.total_seats),
      booked_seats: Number(r.booked_seats),
      available_seats: Number(r.available_seats),
    }));

    const totalAvailable = candidates.reduce((s, c) => s + c.available_seats, 0);
    if (totalAvailable < tickets.length) {
      await connection.rollback();
      return errorResponse(
        `Insufficient capacity. Need ${tickets.length} seats but only ${totalAvailable} available collectively.`,
        400
      );
    }

    const heap = new MaxHeap<Candidate>((c) => c.available_seats);
    for (const c of candidates) heap.push({ ...c });

    const moves: Array<{ ticket_id: number; from: number; to: number }> = [];

    for (const ticketId of tickets) {
      const best = heap.pop();
      if (!best || best.available_seats <= 0) {
        await connection.rollback();
        return errorResponse('Unexpected capacity error during distribution', 500);
      }

      moves.push({ ticket_id: ticketId, from: source_flight_schedule_id, to: best.flight_schedule_id });

      best.available_seats -= 1; // consume a seat
      heap.push(best);
    }


    for (const m of moves) {
      await connection.execute(
        `UPDATE Tickets
         SET flight_schedule_id = ?, status = 'Moved'
         WHERE ticket_id = ?`,
        [m.to, m.ticket_id]
      );

      await connection.execute(
        `UPDATE Baggage
         SET flight_schedule_id = ?
         WHERE ticket_id = ?`,
        [m.to, m.ticket_id]
      );

      await connection.execute(
        `UPDATE Boarding_records br
         JOIN Flight_schedules fs ON fs.flight_schedule_id = ?
         SET br.flight_schedule_id = ?, br.gate_id = fs.gate_id
         WHERE br.ticket_id = ?`,
        [m.to, m.to, m.ticket_id]
      );
    }

    const movedByTarget = new Map<number, number>();
    for (const m of moves) movedByTarget.set(m.to, (movedByTarget.get(m.to) || 0) + 1);

    for (const [targetId, count] of movedByTarget.entries()) {
      await connection.execute(
        `INSERT INTO Flight_consolidation
          (original_flight_schedule_id, new_flight_schedule_id, reason, consolidation_date)
         VALUES (?, ?, ?, NOW())`,
        [
          source_flight_schedule_id,
          targetId,
          reason || `Auto consolidation: moved ${count} passenger(s) to schedule ${targetId}`,
        ]
      );
    }

    await connection.execute(
      `UPDATE Flight_schedules
       SET flight_status = 'Cancelled'
       WHERE flight_schedule_id = ?`,
      [source_flight_schedule_id]
    );

    await connection.commit();

    return successResponse(
      {
        source_flight_schedule_id,
        passengers_moved: moves.length,
        distribution: Array.from(movedByTarget.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([target_flight_schedule_id, passengers_moved]) => ({
            target_flight_schedule_id,
            passengers_moved,
          })),
      },
      'Flight consolidation executed successfully'
    );
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Consolidation execution error:', error);
    return errorResponse('Failed to execute consolidation: ' + error.message, 500);
  } finally {
    if (connection) await connection.end();
  }
}
