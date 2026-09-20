import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { del } from '@vercel/blob';
import { unlink } from 'fs/promises';
import path from 'path';

// DELETE /api/photos/[id] — delete a photo (only if no vehicles linked)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check if any vehicles are linked
    const vehicleCount = await prisma.vehicle.count({
      where: {
        photos: {
          some: { id },
        },
      },
    });

    if (vehicleCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${vehicleCount} vehicle(s) are still linked to this photo` },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete image file (from Vercel Blob or local storage)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.VEHICLE_BLOB_READ_WRITE_TOKEN;
    if (photo.url && photo.url.startsWith('http') && blobToken) {
      try {
        await del(photo.url, { token: blobToken });
      } catch (e) {
        console.warn('Could not delete blob from Vercel storage:', e.message);
      }
    } else {
      try {
        const filepath = path.join(process.cwd(), 'public', 'uploads', photo.filename);
        await unlink(filepath);
      } catch (e) {
        // file may not exist or is remote
      }
    }

    // Delete from database
    await prisma.photo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
