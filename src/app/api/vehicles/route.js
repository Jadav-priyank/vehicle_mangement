import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Normalize vehicle number: uppercase, remove all spaces/dashes/dots
function normalize(number) {
  return number.toUpperCase().replace(/[\s\-\.]/g, '');
}

// GET /api/vehicles — search or list all
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const photoInclude = {
      photos: {
        include: {
          vehicles: {
            select: {
              id: true,
              vehicleNumber: true,
              normalizedNumber: true,
            },
          },
        },
      },
    };

    if (query) {
      const normalized = normalize(query);

      // Search by normalized number (partial match)
      const vehicles = await prisma.vehicle.findMany({
        where: {
          normalizedNumber: {
            contains: normalized,
          },
        },
        include: photoInclude,
        orderBy: { addedDate: 'desc' },
      });

      // Provide both photos array and legacy photo (first photo) for backwards compatibility
      const formatted = vehicles.map((v) => ({
        ...v,
        photo: v.photos[0] || null,
      }));

      return NextResponse.json({ query: normalized, results: formatted });
    }

    // List all vehicles
    const vehicles = await prisma.vehicle.findMany({
      include: photoInclude,
      orderBy: { addedDate: 'desc' },
    });

    const formatted = vehicles.map((v) => ({
      ...v,
      photo: v.photos[0] || null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
  }
}

// POST /api/vehicles — create one or more vehicle records with one or more photos
export async function POST(request) {
  try {
    const body = await request.json();
    const { vehicleNumbers, photoId, photoIds, notes } = body;

    if (!vehicleNumbers || !Array.isArray(vehicleNumbers) || vehicleNumbers.length === 0) {
      return NextResponse.json({ error: 'vehicleNumbers array is required' }, { status: 400 });
    }

    // Collect all photo IDs from photoIds array or single photoId
    let targetPhotoIds = [];
    if (Array.isArray(photoIds)) {
      targetPhotoIds = photoIds.filter(Boolean);
    } else if (photoId) {
      targetPhotoIds = Array.isArray(photoId) ? photoId.filter(Boolean) : [photoId];
    }

    if (targetPhotoIds.length === 0) {
      return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 });
    }

    // Verify photos exist
    const photos = await prisma.photo.findMany({
      where: { id: { in: targetPhotoIds } },
    });
    if (photos.length === 0) {
      return NextResponse.json({ error: 'No matching photos found' }, { status: 404 });
    }

    const validPhotoIds = photos.map((p) => p.id);

    // Create vehicles
    const created = [];
    for (const num of vehicleNumbers) {
      const trimmed = num.trim();
      if (!trimmed) continue;

      const vehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber: trimmed,
          normalizedNumber: normalize(trimmed),
          notes: notes || null,
          photos: {
            connect: validPhotoIds.map((id) => ({ id })),
          },
        },
        include: {
          photos: true,
        },
      });
      created.push({
        ...vehicle,
        photo: vehicle.photos[0] || null,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicles:', error);
    return NextResponse.json({ error: 'Failed to create vehicles' }, { status: 500 });
  }
}
