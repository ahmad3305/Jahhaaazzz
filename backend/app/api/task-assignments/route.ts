import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, createdResponse, notFoundResponse, noContentResponse, validationErrorResponse } from '@/lib/response';
import { taskAssignmentCreateSchema, taskAssignmentUpdateSchema, validateData } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get('task_id');
    const staff_id = searchParams.get('staff_id');
    const assignment_status = searchParams.get('assignment_status');

    let sql = `
      SELECT 
        ta.*,
        t.task_type,
        t.required_role,
        t.start_time,
        t.end_time,
        t.task_status,
        s.first_name,
        s.last_name,
        s.role as staff_role,
        s.staff_type,
        fs.departure_datetime,
        fs.flight_status,
        f.flight_number,
        al.airline_name,
        al.airline_code
      FROM Task_assignments ta
      LEFT JOIN Tasks t ON ta.task_id = t.task_id
      LEFT JOIN Staff s ON ta.staff_id = s.staff_id
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (task_id) {
      sql += ' AND ta.task_id = ?';
      params.push(parseInt(task_id));
    }

    if (staff_id) {
      sql += ' AND ta.staff_id = ?';
      params.push(parseInt(staff_id));
    }

    if (assignment_status) {
      sql += ' AND ta.assignment_status = ?';
      params.push(assignment_status);
    }

    sql += ' ORDER BY ta.assignment_time DESC';

    const assignments = await query(sql, params);

    return successResponse(assignments, 'Task assignments retrieved successfully');
  } catch (error: any) {
    console.error('Get task assignments error:', error);
    return errorResponse('Failed to retrieve task assignments: ' + error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateData(taskAssignmentCreateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data!;

    const task = await queryOne<any>(
      'SELECT * FROM Tasks WHERE task_id = ?',
      [data.task_id]
    );

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    if (task.task_status === 'Completed') {
      return errorResponse('Cannot assign staff to a completed task', 400);
    }

    const staff = await queryOne<any>(
      'SELECT * FROM Staff WHERE staff_id = ?',
      [data.staff_id]
    );

    if (!staff) {
      return errorResponse('Staff member not found', 404);
    }

    if (staff.status === 'Inactive') {
      return errorResponse('Cannot assign an inactive staff member', 400);
    }

    const existingAssignment = await queryOne(
      'SELECT assignment_id FROM Task_assignments WHERE task_id = ? AND staff_id = ? AND assignment_status = ?',
      [data.task_id, data.staff_id, 'Assigned']
    );

    if (existingAssignment) {
      return errorResponse('Staff member is already assigned to this task', 409);
    }

    const result = await query<any>(
      `INSERT INTO Task_assignments (
        task_id, staff_id, assignment_time, assignment_status, end_time
      ) VALUES (?, ?, NOW(), ?, ?)`,
      [
        data.task_id,
        data.staff_id,
        data.assignment_status || 'Assigned',
        data.end_time || null,
      ]
    );

    if (task.task_status === 'Pending') {
      await query(
        'UPDATE Tasks SET task_status = ? WHERE task_id = ?',
        ['Assigned', data.task_id]
      );
    }

    const newAssignment = await queryOne(
      `SELECT 
        ta.*,
        t.task_type,
        t.required_role,
        t.start_time,
        t.end_time as task_end_time,
        t.task_status,
        s.first_name,
        s.last_name,
        s.role as staff_role,
        s.staff_type,
        f.flight_number,
        al.airline_name
      FROM Task_assignments ta
      LEFT JOIN Tasks t ON ta.task_id = t.task_id
      LEFT JOIN Staff s ON ta.staff_id = s.staff_id
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      WHERE ta.assignment_id = ?`,
      [result.insertId]
    );

    return createdResponse(newAssignment, 'Task assignment created successfully');
  } catch (error: any) {
    console.error('Create task assignment error:', error);
    return errorResponse('Failed to create task assignment: ' + error.message, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Assignment ID is required', 400);
    }

    const assignmentId = parseInt(id);

    if (isNaN(assignmentId)) {
      return errorResponse('Invalid assignment ID', 400);
    }

    const existing = await queryOne<any>(
      'SELECT * FROM Task_assignments WHERE assignment_id = ?',
      [assignmentId]
    );

    if (!existing) {
      return notFoundResponse('Task assignment not found');
    }

    const body = await request.json();

    const validation = validateData(taskAssignmentUpdateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const updateData = validation.data!;

    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.assignment_status !== undefined) {
      updates.push('assignment_status = ?');
      values.push(updateData.assignment_status);
    }
    if (updateData.end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(updateData.end_time);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    values.push(assignmentId);

    await query(
      `UPDATE Task_assignments SET ${updates.join(', ')} WHERE assignment_id = ?`,
      values
    );

    const updatedAssignment = await queryOne(
      `SELECT 
        ta.*,
        t.task_type,
        t.required_role,
        t.task_status,
        s.first_name,
        s.last_name,
        s.role as staff_role,
        f.flight_number,
        al.airline_name
      FROM Task_assignments ta
      LEFT JOIN Tasks t ON ta.task_id = t.task_id
      LEFT JOIN Staff s ON ta.staff_id = s.staff_id
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      WHERE ta.assignment_id = ?`,
      [assignmentId]
    );

    return successResponse(updatedAssignment, 'Task assignment updated successfully');
  } catch (error: any) {
    console.error('Update task assignment error:', error);
    return errorResponse('Failed to update task assignment: ' + error.message, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Assignment ID is required', 400);
    }

    const assignmentId = parseInt(id);

    if (isNaN(assignmentId)) {
      return errorResponse('Invalid assignment ID', 400);
    }

    const existing = await queryOne<any>(
      'SELECT * FROM Task_assignments WHERE assignment_id = ?',
      [assignmentId]
    );

    if (!existing) {
      return notFoundResponse('Task assignment not found');
    }

    if (existing.assignment_status === 'Completed') {
      return errorResponse('Cannot delete a completed task assignment', 400);
    }

    await query('DELETE FROM Task_assignments WHERE assignment_id = ?', [assignmentId]);

    return noContentResponse();
  } catch (error: any) {
    console.error('Delete task assignment error:', error);
    return errorResponse('Failed to delete task assignment: ' + error.message, 500);
  }
}
