import { NextResponse } from 'next/server';

export function successResponse(data: any, message: string = 'Success', statusCode: number = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function errorResponse(message: string, statusCode: number = 400, errors?: any) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors && { errors }),
    },
    { status: statusCode }
  );
}

export function createdResponse(data: any, message: string = 'Created successfully') {
  return successResponse(data, message, 201);
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return errorResponse(message, 403);
}

export function notFoundResponse(message: string = 'Resource not found') {
  return errorResponse(message, 404);
}

export function validationErrorResponse(errors: any) {
  return errorResponse('Validation failed', 422, errors);
}

export function serverErrorResponse(message: string = 'Internal server error') {
  return errorResponse(message, 500);
}
