import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AuthUser } from './auth';
import { errorResponse } from './response';

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

export function authenticate(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse('No token provided. Please login first.', 401);
      }

      const token = authHeader.substring(7);
      
      const user = verifyToken(token);
      
      if (!user) {
        return errorResponse('Invalid or expired token. Please login again.', 401);
      }
      req.user = user;
      return handler(req);
    } catch (error: any) {
      console.error('Authentication error:', error);
      return errorResponse('Authentication failed: ' + error.message, 401);
    }
  };
}
export function authorize(...allowedRoles: Array<'Admin' | 'Staff' | 'Customer'>) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return authenticate(async (req: AuthenticatedRequest): Promise<NextResponse> => {
      const user = req.user;

      if (!user) {
        return errorResponse('Unauthorized', 401);
      }
      if (!allowedRoles.includes(user.role)) {
        return errorResponse(
          `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${user.role}`,
          403
        );
      }
      return handler(req);
    });
  };
}
export const requireAdmin = authorize('Admin');
export const requireStaff = authorize('Admin', 'Staff');
export const requireAuth = authenticate;
