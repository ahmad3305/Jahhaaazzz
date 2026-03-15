import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, noContentResponse, validationErrorResponse } from '@/lib/response';
import { ticketUpdateSchema, validateData } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id);

    if (isNaN(ticketId)) {
      return errorResponse('Invalid ticket ID', 400);
    }

    const ticket = await queryOne(
      `SELECT 
        t.*,
        p.first_name,
        p.last_name,
        p.email,
        p.passport_number,
        p.contact_number,
        p.date_of_birth,
        p.nationality,
        p.gender,
        fs.flight_schedule_id,
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
        dest.country as destination_country,
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

    if (!ticket) {
      return notFoundResponse('Ticket not found');
    }

    return successResponse(ticket, 'Ticket retrieved successfully');
  } catch (error: any) {
    console.error('Get ticket error:', error);
    return errorResponse('Failed to retrieve ticket: ' + error.message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id);

    if (isNaN(ticketId)) {
      return errorResponse('Invalid ticket ID', 400);
    }

    const existing = await queryOne<any>(
      `SELECT t.*, fs.flight_status, fs.departure_datetime
       FROM Tickets t
       LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
       WHERE t.ticket_id = ?`,
      [ticketId]
    );

    if (!existing) {
      return notFoundResponse('Ticket not found');
    }

    if (existing.status === 'Boarded') {
      return errorResponse('Cannot update a boarded ticket', 400);
    }

    if (existing.flight_status === 'Completed') {
      return errorResponse('Cannot update ticket for a completed flight', 400);
    }

    const body = await request.json();

    const validation = validateData(ticketUpdateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const updateData = validation.data!;

    if (updateData.seat_number && updateData.seat_number !== existing.seat_number) {
      const seatTaken = await queryOne(
        'SELECT ticket_id FROM Tickets WHERE flight_schedule_id = ? AND seat_number = ? AND status != ? AND ticket_id != ?',
        [existing.flight_schedule_id, updateData.seat_number, 'Cancelled', ticketId]
      );

      if (seatTaken) {
        return errorResponse('Seat is already taken', 409);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.seat_number !== undefined) {
      updates.push('seat_number = ?');
      values.push(updateData.seat_number);
    }
    if (updateData.seat_class !== undefined) {
      updates.push('seat_class = ?');
      values.push(updateData.seat_class);
    }
    if (updateData.ticket_price !== undefined) {
      updates.push('ticket_price = ?');
      values.push(updateData.ticket_price);
    }
    if (updateData.status !== undefined) {
      updates.push('status = ?');
      values.push(updateData.status);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    values.push(ticketId);

    await query(
      `UPDATE Tickets SET ${updates.join(', ')} WHERE ticket_id = ?`,
      values
    );

    const updatedTicket = await queryOne(
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
      [ticketId]
    );

    return successResponse(updatedTicket, 'Ticket updated successfully');
  } catch (error: any) {
    console.error('Update ticket error:', error);
    return errorResponse('Failed to update ticket: ' + error.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id);

    if (isNaN(ticketId)) {
      return errorResponse('Invalid ticket ID', 400);
    }

    const existing = await queryOne<any>(
      `SELECT t.*, fs.flight_status
       FROM Tickets t
       LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
       WHERE t.ticket_id = ?`,
      [ticketId]
    );

    if (!existing) {
      return notFoundResponse('Ticket not found');
    }

    if (existing.status === 'Boarded') {
      return errorResponse('Cannot delete a boarded ticket', 400);
    }

    if (existing.flight_status === 'Completed') {
      return errorResponse('Cannot delete ticket for a completed flight', 400);
    }

    const payment = await queryOne<any>(
      'SELECT payment_id, payment_status FROM Payments WHERE ticket_id = ?',
      [ticketId]
    );

    if (payment && payment.payment_status === 'Completed') {
      return errorResponse('Cannot delete ticket with a completed payment. Process a refund first.', 400);
    }

    await query('DELETE FROM Tickets WHERE ticket_id = ?', [ticketId]);

    return noContentResponse();
  } catch (error: any) {
    console.error('Delete ticket error:', error);
    return errorResponse('Failed to delete ticket: ' + error.message, 500);
  }
}
