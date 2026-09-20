import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Normalize vehicle number
function normalize(number) {
  return number.toUpperCase().replace(/[\s\-\.]/g, '');
}

// PUT /api/vehicles/[id] — update a vehicle record
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { vehicleNumber, notes, photoId, photoIds } = body;

    const updateData = {};
    if (vehicleNumber !== undefined) {
      updateData.vehicleNumber = vehicleNumber.trim();
      updateData.normalizedNumber = normalize(vehicleNumber);
    }
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }
    if (photoIds !== undefined) {
      const ids = Array.isArray(photoIds) ? photoIds.filter(Boolean) : [photoIds];
      updateData.photos = {
        set: ids.map((pid) => ({ id: pid })),
      };
    } else if (photoId !== undefined) {
      updateData.photos = {
        set: photoId ? [{ id: photoId }] : [],
      };
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        photos: true,
      },
    });

    return NextResponse.json({
      ...vehicle,
      photo: vehicle.photos[0] || null,
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
}

import { del } from '@vercel/blob';
import { unlink } from 'fs/promises';
import path from 'path';

// Helper to safely delete photo file/blob
async function deletePhotoFile(photo) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.VEHICLE_BLOB_READ_WRITE_TOKEN;
  if (photo.url && photo.url.startsWith('http') && blobToken) {
    try {
      await del(photo.url, { token: blobToken });
    } catch (e) {
      console.warn('Could not delete blob:', e.message);
    }
  } else if (photo.filename) {
    try {
      const filepath = path.join(process.cwd(), 'public', 'uploads', photo.filename);
      await unlink(filepath);
    } catch (e) {
      // ignore if file doesn't exist
    }
  }
}

// DELETE /api/vehicles/[id] — delete a vehicle record and its orphaned photos
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Find vehicle with its photos and all vehicles attached to those photos
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        photos: {
          include: {
            vehicles: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Delete the vehicle record
    await prisma.vehicle.delete({ where: { id } });

    // Check each photo: if it has no other vehicles, delete it from storage and database
    for (const photo of vehicle.photos) {
      const otherVehicles = (photo.vehicles || []).filter((v) => v.id !== id);
      if (otherVehicles.length === 0) {
        await deletePhotoFile(photo);
        try {
          await prisma.photo.delete({ where: { id: photo.id } });
        } catch (e) {
          console.warn('Failed to delete photo record:', e.message);
        }
      }
    }

    return NextResponse.json({ success: true, deletedVehicleId: id });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}
