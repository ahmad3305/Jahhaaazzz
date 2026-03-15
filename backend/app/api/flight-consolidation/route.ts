export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';
import { verifyToken } from '@/lib/auth';

function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.substring(7) || '';
  const user = verifyToken(token);
  return user && user.role === 'Admin' ? user : null;
}

export async function GET(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return errorResponse('Admin access required', 403);

  try {
    const rows = await query(
      `SELECT 
        fc.*,
        orig_f.flight_number AS original_flight_number,
        new_f.flight_number AS new_flight_number
      FROM Flight_consolidation fc
      LEFT JOIN Flight_schedules orig_fs ON fc.original_flight_schedule_id = orig_fs.flight_schedule_id
      LEFT JOIN Flights orig_f ON orig_fs.flight_id = orig_f.flight_id
      LEFT JOIN Flight_schedules new_fs ON fc.new_flight_schedule_id = new_fs.flight_schedule_id
      LEFT JOIN Flights new_f ON new_fs.flight_id = new_f.flight_id
      ORDER BY fc.consolidation_date DESC`
    );

    return successResponse(rows, 'Flight consolidations retrieved successfully');
  } catch (error: any) {
    console.error('List consolidations error:', error);
    return errorResponse('Failed to retrieve flight consolidations: ' + error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return errorResponse('Admin access required', 403);

  try {
    const body = await request.json();
    const { original_flight_schedule_id, new_flight_schedule_id, reason, consolidation_date } = body;

    if (!original_flight_schedule_id || !new_flight_schedule_id || !reason) {
      return errorResponse('original_flight_schedule_id, new_flight_schedule_id, and reason are required', 400);
    }
    if (original_flight_schedule_id === new_flight_schedule_id) {
      return errorResponse('Cannot consolidate a flight to itself', 400);
    }

    const result: any = await query(
      `INSERT INTO Flight_consolidation
        (original_flight_schedule_id, new_flight_schedule_id, reason, consolidation_date)
       VALUES (?, ?, ?, ?)`,
      [original_flight_schedule_id, new_flight_schedule_id, reason, consolidation_date || new Date()]
    );

    return successResponse(
      { consolidation_id: result.insertId },
      'Flight consolidation record created successfully'
    );
  } catch (error: any) {
    console.error('Create consolidation error:', error);
    return errorResponse('Failed to create flight consolidation record: ' + error.message, 500);
  }
}
