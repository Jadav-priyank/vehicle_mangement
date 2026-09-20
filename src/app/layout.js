import './globals.css';

export const metadata = {
  title: 'Vehicle Records Manager',
  description: 'Search and manage vehicle records with photos — fast, mobile-friendly field tool.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
