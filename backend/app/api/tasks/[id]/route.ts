import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, noContentResponse, validationErrorResponse } from '@/lib/response';
import { taskUpdateSchema, validateData } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const task = await queryOne(
      `SELECT 
        t.*,
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
        dest.airport_name as destination_airport_name,
        dest.airport_code as destination_airport_code,
        dest.city as destination_city
      FROM Tasks t
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN Airport src ON f.source_airport_id = src.airport_id
      LEFT JOIN Airport dest ON f.destination_airport_id = dest.airport_id
      WHERE t.task_id = ?`,
      [taskId]
    );

    if (!task) {
      return notFoundResponse('Task not found');
    }

    return successResponse(task, 'Task retrieved successfully');
  } catch (error: any) {
    console.error('Get task error:', error);
    return errorResponse('Failed to retrieve task: ' + error.message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const existing = await queryOne<any>(
      'SELECT * FROM Tasks WHERE task_id = ?',
      [taskId]
    );

    if (!existing) {
      return notFoundResponse('Task not found');
    }

    const body = await request.json();

    const validation = validateData(taskUpdateSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const updateData = validation.data!;

    if (existing.task_status === 'Completed') {
      return errorResponse('Cannot update a completed task', 400);
    }

    if (updateData.flight_schedule_id) {
      const schedule = await queryOne(
        'SELECT flight_schedule_id FROM Flight_schedules WHERE flight_schedule_id = ?',
        [updateData.flight_schedule_id]
      );

      if (!schedule) {
        return errorResponse('Flight schedule not found', 404);
      }
    }

    if (updateData.start_time && updateData.end_time) {
      if (new Date(updateData.end_time) <= new Date(updateData.start_time)) {
        return errorResponse('End time must be after start time', 400);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.flight_schedule_id !== undefined) {
      updates.push('flight_schedule_id = ?');
      values.push(updateData.flight_schedule_id);
    }
    if (updateData.task_type !== undefined) {
      updates.push('task_type = ?');
      values.push(updateData.task_type);
    }
    if (updateData.required_role !== undefined) {
      updates.push('required_role = ?');
      values.push(updateData.required_role);
    }
    if (updateData.start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(updateData.start_time);
    }
    if (updateData.end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(updateData.end_time);
    }
    if (updateData.task_status !== undefined) {
      updates.push('task_status = ?');
      values.push(updateData.task_status);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    values.push(taskId);

    await query(
      `UPDATE Tasks SET ${updates.join(', ')} WHERE task_id = ?`,
      values
    );

    const updatedTask = await queryOne(
      `SELECT 
        t.*,
        fs.departure_datetime,
        fs.arrival_datetime,
        fs.flight_status,
        f.flight_number,
        al.airline_name
      FROM Tasks t
      LEFT JOIN Flight_schedules fs ON t.flight_schedule_id = fs.flight_schedule_id
      LEFT JOIN Flights f ON fs.flight_id = f.flight_id
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      WHERE t.task_id = ?`,
      [taskId]
    );

    return successResponse(updatedTask, 'Task updated successfully');
  } catch (error: any) {
    console.error('Update task error:', error);
    return errorResponse('Failed to update task: ' + error.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 400);
    }

    const existing = await queryOne<any>(
      'SELECT * FROM Tasks WHERE task_id = ?',
      [taskId]
    );

    if (!existing) {
      return notFoundResponse('Task not found');
    }

    if (existing.task_status === 'In Progress' || existing.task_status === 'Completed') {
      return errorResponse(
        `Cannot delete task with status ${existing.task_status}`,
        400
      );
    }

    const hasAssignments = await queryOne<any>(
      'SELECT COUNT(*) as count FROM Task_assignments WHERE task_id = ?',
      [taskId]
    );

    if ((hasAssignments as any).count > 0) {
      return errorResponse('Cannot delete task with existing assignments', 409);
    }

    await query('DELETE FROM Tasks WHERE task_id = ?', [taskId]);

    return noContentResponse();
  } catch (error: any) {
    console.error('Delete task error:', error);
    return errorResponse('Failed to delete task: ' + error.message, 500);
  }
}
