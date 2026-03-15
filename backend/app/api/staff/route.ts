import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, createdResponse, validationErrorResponse } from '@/lib/response';
import { staffCreateSchema, validateData } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airport_id = searchParams.get('airport_id');
    const role = searchParams.get('role');
    const staff_type = searchParams.get('staff_type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        s.*,
        a.airport_name,
        a.airport_code,
        a.city,
        a.country
      FROM Staff s
      LEFT JOIN Airport a ON s.airport_id = a.airport_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (airport_id) {
      sql += ' AND s.airport_id = ?';
      params.push(parseInt(airport_id));
    }

    if (role) {
      sql += ' AND s.role = ?';
      params.push(role);
    }

    if (staff_type) {
      sql += ' AND s.staff_type = ?';
      params.push(staff_type);
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (s.first_name LIKE ? OR s.last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.last_name ASC, s.first_name ASC';

    const staff = await query(sql, params);

    return successResponse(staff, 'Staff retrieved successfully');
  } catch (error: any) {
    console.error('Get staff error:', error);
    return errorResponse('Failed to retrieve staff: ' + error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateData(staffCreateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data!;

    const airport = await queryOne(
      'SELECT airport_id FROM Airport WHERE airport_id = ?',
      [data.airport_id]
    );

    if (!airport) {
      return errorResponse('Airport not found', 404);
    }

    if (data.license_number) {
      const existingLicense = await queryOne(
        'SELECT staff_id FROM Staff WHERE license_number = ?',
        [data.license_number]
      );

      if (existingLicense) {
        return errorResponse('License number already exists', 409);
      }
    }

    const result = await query<any>(
      `INSERT INTO Staff (
        airport_id, first_name, last_name, role,
        staff_type, hire_date, license_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.airport_id,
        data.first_name,
        data.last_name,
        data.role,
        data.staff_type,
        data.hire_date || null,
        data.license_number || null,
        data.status || 'Active',
      ]
    );

    const newStaff = await queryOne(
      `SELECT s.*, a.airport_name, a.airport_code, a.city, a.country
       FROM Staff s
       LEFT JOIN Airport a ON s.airport_id = a.airport_id
       WHERE s.staff_id = ?`,
      [result.insertId]
    );

    return createdResponse(newStaff, 'Staff member created successfully');
  } catch (error: any) {
    console.error('Create staff error:', error);
    return errorResponse('Failed to create staff member: ' + error.message, 500);
  }
}
