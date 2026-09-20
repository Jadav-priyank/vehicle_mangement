import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/export — export all vehicles as CSV
export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        photos: true,
      },
      orderBy: { addedDate: 'desc' },
    });

    // Build CSV
    const header = 'Vehicle Number,Normalized Number,Notes,Added Date,Photo Filenames,Photo IDs';
    const rows = vehicles.map((v) => {
      const notes = (v.notes || '').replace(/"/g, '""');
      const filenames = v.photos.map((p) => p.filename).join('; ');
      const photoIds = v.photos.map((p) => p.id).join('; ');
      return `"${v.vehicleNumber}","${v.normalizedNumber}","${notes}","${v.addedDate.toISOString()}","${filenames}","${photoIds}"`;
    });

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="vehicle_records_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
