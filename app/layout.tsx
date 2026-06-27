import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aksara — Modern Document Workspace',
  description: 'Sign, annotate, and manage documents with precision.',
};

// The PDF canvas implements its own pinch-to-zoom (see PdfCanvas.tsx). If the
// browser's native page-zoom gesture is also active, a two-finger pinch
// triggers both at once, and mobile browsers snap the native zoom back to
// 1x the moment fingers lift — which looks like the canvas "jumping back to
// center" right after zooming. Disabling native pinch/double-tap zoom here
// removes that conflict; all zooming then goes through our own scale state.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}