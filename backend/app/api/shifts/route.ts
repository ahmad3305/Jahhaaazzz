import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, createdResponse, validationErrorResponse } from '@/lib/response';
import { shiftCreateSchema, validateData } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staff_id = searchParams.get('staff_id');
    const shift_date = searchParams.get('shift_date');
    const availability_status = searchParams.get('availability_status');

    let sql = `
      SELECT 
        sh.*,
        s.first_name,
        s.last_name,
        s.role,
        s.staff_type,
        a.airport_name,
        a.airport_code,
        a.city
      FROM Shifts sh
      LEFT JOIN Staff s ON sh.staff_id = s.staff_id
      LEFT JOIN Airport a ON s.airport_id = a.airport_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (staff_id) {
      sql += ' AND sh.staff_id = ?';
      params.push(parseInt(staff_id));
    }

    if (shift_date) {
      sql += ' AND sh.shift_date = ?';
      params.push(shift_date);
    }

    if (availability_status) {
      sql += ' AND sh.availability_status = ?';
      params.push(availability_status);
    }

    sql += ' ORDER BY sh.shift_date DESC, sh.shift_start ASC';

    const shifts = await query(sql, params);

    return successResponse(shifts, 'Shifts retrieved successfully');
  } catch (error: any) {
    console.error('Get shifts error:', error);
    return errorResponse('Failed to retrieve shifts: ' + error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateData(shiftCreateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data!;

    const staff = await queryOne(
      'SELECT staff_id FROM Staff WHERE staff_id = ?',
      [data.staff_id]
    );

    if (!staff) {
      return errorResponse('Staff member not found', 404);
    }

    const result = await query<any>(
      `INSERT INTO Shifts (
        staff_id, shift_date, shift_start, shift_end, availability_status
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        data.staff_id,
        data.shift_date,
        data.shift_start,
        data.shift_end,
        data.availability_status || 'Available',
      ]
    );

    const newShift = await queryOne(
      `SELECT sh.*, s.first_name, s.last_name, s.role, s.staff_type,
              a.airport_name, a.airport_code, a.city
       FROM Shifts sh
       LEFT JOIN Staff s ON sh.staff_id = s.staff_id
       LEFT JOIN Airport a ON s.airport_id = a.airport_id
       WHERE sh.shift_id = ?`,
      [result.insertId]
    );

    return createdResponse(newShift, 'Shift created successfully');
  } catch (error: any) {
    console.error('Create shift error:', error);
    return errorResponse('Failed to create shift: ' + error.message, 500);
  }
}
