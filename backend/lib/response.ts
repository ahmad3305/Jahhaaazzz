import { NextResponse } from 'next/server';

export function successResponse(data: any, message: string = 'Success', status: number = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function createdResponse(data: any, message: string = 'Created') {
  return NextResponse.json({ success: true, message, data }, { status: 201 });
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function notFoundResponse(message: string = 'Not found') {
  return NextResponse.json({ success: false, message }, { status: 404 });
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

export function validationErrorResponse(errors: any) {
  return NextResponse.json(
    { success: false, message: 'Validation failed', errors },
    { status: 422 }
  );
}
