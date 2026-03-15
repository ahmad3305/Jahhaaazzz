import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, createdResponse, validationErrorResponse } from '@/lib/response';
import { ticketCreateSchema, validateData } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passenger_id = searchParams.get('passenger_id');
    const flight_schedule_id = searchParams.get('flight_schedule_id');
    const status = searchParams.get('status');
    const seat_class = searchParams.get('seat_class');

    let sql = `
      SELECT 
        t.*,
        p.first_name,
        p.last_name,
        p.email,
        p.passport_number,
        p.contact_number,
        p.nationality,
        fs.departure_datetime,
        fs.arrival_datetime,
        fs.flight_status,
        f.flight_number,
        f.flight_type,
        al.airline_name,
        al.airline_code,
        src.airport_name as source_airport_name,
        src.airport_code as source_airport_code,
        src.city as source_city,
        src.country as source_country,
        dest.airport_name as destination_airport_name,
        dest.airport_code as destination_airport_code,
        dest.city as destination_city,
        dest.country as destination_country
      FROM Tickets t
      LEFT JOIN Passengers p ON t.passenger_id = p.passenger_id
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN Airport src ON f.source_airport_id = src.airport_id
      LEFT JOIN Airport dest ON f.destination_airport_id = dest.airport_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (passenger_id) {
      sql += ' AND t.passenger_id = ?';
      params.push(parseInt(passenger_id));
    }

    if (flight_schedule_id) {
      sql += ' AND t.flight_schedule_id = ?';
      params.push(parseInt(flight_schedule_id));
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (seat_class) {
      sql += ' AND t.seat_class = ?';
      params.push(seat_class);
    }

    sql += ' ORDER BY t.booking_date DESC';

    const tickets = await query(sql, params);

    return successResponse(tickets, 'Tickets retrieved successfully');
  } catch (error: any) {
    console.error('Get tickets error:', error);
    return errorResponse('Failed to retrieve tickets: ' + error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateData(ticketCreateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data!;

    const passenger = await queryOne<any>(
      'SELECT * FROM Passengers WHERE passenger_id = ?',
      [data.passenger_id]
    );

    if (!passenger) {
      return errorResponse('Passenger not found', 404);
    }

    const schedule = await queryOne<any>(
      `SELECT fs.*, ac.economy_seats, ac.business_seats, ac.first_class_seats
       FROM Flight_schedules fs
       LEFT JOIN Aircraft ac ON fs.aircraft_id = ac.aircraft_id
       WHERE fs.flight_schedule_id = ?`,
      [data.flight_schedule_id]
    );

    if (!schedule) {
      return errorResponse('Flight schedule not found', 404);
    }

    if (schedule.flight_status === 'Cancelled') {
      return errorResponse('Cannot book a cancelled flight', 400);
    }

    if (schedule.flight_status === 'Completed') {
      return errorResponse('Cannot book a completed flight', 400);
    }

    const existingTicket = await queryOne(
      'SELECT ticket_id FROM Tickets WHERE passenger_id = ? AND flight_schedule_id = ? AND status != ?',
      [data.passenger_id, data.flight_schedule_id, 'Cancelled']
    );

    if (existingTicket) {
      return errorResponse('Passenger already has a ticket for this flight', 409);
    }

    if (data.seat_number) {
      const seatTaken = await queryOne(
        'SELECT ticket_id FROM Tickets WHERE flight_schedule_id = ? AND seat_number = ? AND status != ?',
        [data.flight_schedule_id, data.seat_number, 'Cancelled']
      );

      if (seatTaken) {
        return errorResponse('Seat is already taken', 409);
      }
    }

    const result = await query<any>(
      `INSERT INTO Tickets (
        passenger_id, flight_schedule_id, seat_number,
        seat_class, ticket_price, booking_date, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
      [
        data.passenger_id,
        data.flight_schedule_id,
        data.seat_number || null,
        data.seat_class,
        data.ticket_price || 0,
        data.status || 'Confirmed',
      ]
    );

    const newTicket = await queryOne(
      `SELECT 
        t.*,
        p.first_name,
        p.last_name,
        p.email,
        p.passport_number,
        fs.departure_datetime,
        fs.arrival_datetime,
        fs.flight_status,
        f.flight_number,
        al.airline_name,
        al.airline_code,
        src.airport_name as source_airport_name,
        src.airport_code as source_airport_code,
        dest.airport_name as destination_airport_name,
        dest.airport_code as destination_airport_code
      FROM Tickets t
      LEFT JOIN Passengers p ON t.passenger_id = p.passenger_id
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN Airport src ON f.source_airport_id = src.airport_id
      LEFT JOIN Airport dest ON f.destination_airport_id = dest.airport_id
      WHERE t.ticket_id = ?`,
      [result.insertId]
    );

    return createdResponse(newTicket, 'Ticket booked successfully');
  } catch (error: any) {
    console.error('Create ticket error:', error);
    return errorResponse('Failed to book ticket: ' + error.message, 500);
  }
}
