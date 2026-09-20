import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// GET /api/photos — list all photos with vehicle counts
export async function GET() {
  try {
    const photos = await prisma.photo.findMany({
      include: {
        vehicles: {
          select: {
            id: true,
            vehicleNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

// POST /api/photos — upload one or more photos (supports Vercel Blob & Local)
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Gather all uploaded files (supports 'files' or 'file')
    let files = formData.getAll('files');
    if (files.length === 0) {
      files = formData.getAll('file');
    }

    // Filter out invalid/empty entries
    files = files.filter((f) => f && typeof f === 'object' && f.name);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.VEHICLE_BLOB_READ_WRITE_TOKEN;
    const hasVercelBlob = Boolean(blobToken);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!hasVercelBlob) {
      await mkdir(uploadDir, { recursive: true });
    }

    const createdPhotos = [];

    for (const file of files) {
      const ext = path.extname(file.name) || '.jpg';
      const filename = `${uuidv4()}${ext}`;
      let imageUrl = '';

      if (hasVercelBlob) {
        // Upload to Vercel Blob cloud storage
        const blob = await put(`vehicles/${filename}`, file, {
          access: 'public',
          contentType: file.type || 'image/jpeg',
          token: blobToken,
        });
        imageUrl = blob.url;
      } else {
        // Local fallback: save to public/uploads
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        imageUrl = `/uploads/${filename}`;
      }

      const photo = await prisma.photo.create({
        data: {
          filename,
          url: imageUrl,
          originalName: file.name,
        },
      });

      createdPhotos.push(photo);
    }

    // If single file uploaded, include photo properties at root for backwards-compatibility
    const responsePayload = createdPhotos.length === 1
      ? { ...createdPhotos[0], photos: createdPhotos }
      : { photos: createdPhotos };

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo(s):', error);
    return NextResponse.json({ error: 'Failed to upload photo(s)' }, { status: 500 });
  }
}
