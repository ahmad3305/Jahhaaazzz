export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, createdResponse, validationErrorResponse } from '@/lib/response';
import { validateData } from '@/lib/validations';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { z } from 'zod';

const checkoutSchema = z.object({
  passenger_id: z.number().int().positive('Passenger ID is required'),
  flight_schedule_id: z.number().int().positive('Flight schedule ID is required'),
  seat_class: z.enum(['Economy', 'Business', 'First']),
  seat_number: z.string().optional(),
  ticket_price: z.number().positive('Ticket price must be positive'),
  payment_method: z.enum(['Credit Card', 'Cash', 'Online Transfer']),
});

async function postHandler(req: AuthenticatedRequest) {
  try {
    const user = req.user!;
    const body = await req.json();

    const validation = validateData(checkoutSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data!;

    if (user.role === 'Customer' && user.passenger_id !== data.passenger_id) {
      return errorResponse('Access denied: cannot checkout for another passenger', 403);
    }

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

    const ticketResult = await query<any>(
      `INSERT INTO Tickets (
        passenger_id, flight_schedule_id, seat_number,
        seat_class, ticket_price, booking_date, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
      [
        data.passenger_id,
        data.flight_schedule_id,
        data.seat_number || null,
        data.seat_class,
        data.ticket_price,
        'Confirmed',
      ]
    );

    const ticketId = ticketResult.insertId;

    const paymentResult = await query<any>(
      `INSERT INTO Payments (
        ticket_id, amount, payment_method, payment_status, payment_date
      ) VALUES (?, ?, ?, 'Completed', NOW())`,
      [ticketId, data.ticket_price, data.payment_method]
    );

    const checkout = await queryOne(
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
        src.city as source_city,
        dest.airport_name as destination_airport_name,
        dest.airport_code as destination_airport_code,
        dest.city as destination_city,
        pay.payment_id,
        pay.amount,
        pay.payment_method,
        pay.payment_status,
        pay.payment_date
      FROM Tickets t
      LEFT JOIN Passengers p ON t.passenger_id = p.passenger_id
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN Airport src ON f.source_airport_id = src.airport_id
      LEFT JOIN Airport dest ON f.destination_airport_id = dest.airport_id
      LEFT JOIN Payments pay ON t.ticket_id = pay.ticket_id
      WHERE t.ticket_id = ?`,
      [ticketId]
    );

    return createdResponse(checkout, 'Checkout completed successfully');
  } catch (error: any) {
    console.error('Checkout error:', error);
    return errorResponse('Checkout failed: ' + error.message, 500);
  }
}

export const POST = requireAuth(postHandler);
