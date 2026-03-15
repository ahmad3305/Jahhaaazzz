import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, noContentResponse, validationErrorResponse } from '@/lib/response';
import { staffUpdateSchema, validateData } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staffId = parseInt(id);

    if (isNaN(staffId)) {
      return errorResponse('Invalid staff ID', 400);
    }

    const staff = await queryOne(
      `SELECT 
        s.*,
        a.airport_name,
        a.airport_code,
        a.city,
        a.country
      FROM Staff s
      LEFT JOIN Airport a ON s.airport_id = a.airport_id
      WHERE s.staff_id = ?`,
      [staffId]
    );

    if (!staff) {
      return notFoundResponse('Staff member not found');
    }

    return successResponse(staff, 'Staff member retrieved successfully');
  } catch (error: any) {
    console.error('Get staff error:', error);
    return errorResponse('Failed to retrieve staff member: ' + error.message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staffId = parseInt(id);

    if (isNaN(staffId)) {
      return errorResponse('Invalid staff ID', 400);
    }

    const existing = await queryOne<any>(
      'SELECT * FROM Staff WHERE staff_id = ?',
      [staffId]
    );

    if (!existing) {
      return notFoundResponse('Staff member not found');
    }

    const body = await request.json();

    const validation = validateData(staffUpdateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const updateData = validation.data!;

    if (updateData.airport_id) {
      const airport = await queryOne(
        'SELECT airport_id FROM Airport WHERE airport_id = ?',
        [updateData.airport_id]
      );

      if (!airport) {
        return errorResponse('Airport not found', 404);
      }
    }

    if (updateData.license_number && updateData.license_number !== existing.license_number) {
      const existingLicense = await queryOne(
        'SELECT staff_id FROM Staff WHERE license_number = ? AND staff_id != ?',
        [updateData.license_number, staffId]
      );

      if (existingLicense) {
        return errorResponse('License number already exists', 409);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.airport_id !== undefined) {
      updates.push('airport_id = ?');
      values.push(updateData.airport_id);
    }
    if (updateData.first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(updateData.first_name);
    }
    if (updateData.last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(updateData.last_name);
    }
    if (updateData.role !== undefined) {
      updates.push('role = ?');
      values.push(updateData.role);
    }
    if (updateData.staff_type !== undefined) {
      updates.push('staff_type = ?');
      values.push(updateData.staff_type);
    }
    if (updateData.hire_date !== undefined) {
      updates.push('hire_date = ?');
      values.push(updateData.hire_date);
    }
    if (updateData.license_number !== undefined) {
      updates.push('license_number = ?');
      values.push(updateData.license_number);
    }
    if (updateData.status !== undefined) {
      updates.push('status = ?');
      values.push(updateData.status);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    values.push(staffId);

    await query(
      `UPDATE Staff SET ${updates.join(', ')} WHERE staff_id = ?`,
      values
    );

    const updatedStaff = await queryOne(
      `SELECT s.*, a.airport_name, a.airport_code, a.city, a.country
       FROM Staff s
       LEFT JOIN Airport a ON s.airport_id = a.airport_id
       WHERE s.staff_id = ?`,
      [staffId]
    );

    return successResponse(updatedStaff, 'Staff member updated successfully');
  } catch (error: any) {
    console.error('Update staff error:', error);
    return errorResponse('Failed to update staff member: ' + error.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staffId = parseInt(id);

    if (isNaN(staffId)) {
      return errorResponse('Invalid staff ID', 400);
    }

    const existing = await queryOne(
      'SELECT * FROM Staff WHERE staff_id = ?',
      [staffId]
    );

    if (!existing) {
      return notFoundResponse('Staff member not found');
    }

    const hasShifts = await queryOne<any>(
      'SELECT COUNT(*) as count FROM Shifts WHERE staff_id = ?',
      [staffId]
    );

    if ((hasShifts as any).count > 0) {
      return errorResponse('Cannot delete staff member with existing shifts', 409);
    }

    const hasAssignments = await queryOne<any>(
      'SELECT COUNT(*) as count FROM Task_assignments WHERE staff_id = ?',
      [staffId]
    );

    if ((hasAssignments as any).count > 0) {
      return errorResponse('Cannot delete staff member with existing task assignments', 409);
    }

    await query('DELETE FROM Staff WHERE staff_id = ?', [staffId]);

    return noContentResponse();
  } catch (error: any) {
    console.error('Delete staff error:', error);
    return errorResponse('Failed to delete staff member: ' + error.message, 500);
  }
}
