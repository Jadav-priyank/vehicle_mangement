import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getOrCreateAdminUser,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from '@/lib/auth';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newUsername, newPassword } = body;

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required to make changes' },
        { status: 400 }
      );
    }

    const admin = await getOrCreateAdminUser();

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, admin.password);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Incorrect current password' },
        { status: 400 }
      );
    }

    const updateData = {};

    if (newUsername && newUsername.trim()) {
      const trimmedNewUser = newUsername.trim();
      if (trimmedNewUser.length < 3) {
        return NextResponse.json(
          { error: 'New ID must be at least 3 characters long' },
          { status: 400 }
        );
      }
      updateData.username = trimmedNewUser;
    }

    if (newPassword && newPassword.trim()) {
      const trimmedNewPass = newPassword.trim();
      if (trimmedNewPass.length < 4) {
        return NextResponse.json(
          { error: 'New password must be at least 4 characters long' },
          { status: 400 }
        );
      }
      updateData.password = hashPassword(trimmedNewPass);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No changes provided. Please enter a new ID or new password.' },
        { status: 400 }
      );
    }

    // Update in database
    let updated;
    if (admin.id && admin.id !== 'default') {
      updated = await prisma.adminUser.update({
        where: { id: admin.id },
        data: updateData,
      });
    } else {
      updated = await prisma.adminUser.upsert({
        where: { username: admin.username },
        update: updateData,
        create: {
          username: updateData.username || admin.username,
          password: updateData.password || admin.password,
        },
      });
    }

    const effectiveUsername = updated.username;
    const newToken = await createSessionToken(effectiveUsername);

    const response = NextResponse.json({
      success: true,
      message: 'Credentials updated successfully!',
      username: effectiveUsername,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Update credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
}
