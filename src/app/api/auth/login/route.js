import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getOrCreateAdminUser,
  verifyPassword,
} from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'ID and Password are required' },
        { status: 400 }
      );
    }

    const admin = await getOrCreateAdminUser();

    // Check username (case-insensitive or exact, username trim)
    if (admin.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid ID or Password' },
        { status: 401 }
      );
    }

    const isPasswordValid = verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid ID or Password' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(admin.username);

    const response = NextResponse.json({
      success: true,
      username: admin.username,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
