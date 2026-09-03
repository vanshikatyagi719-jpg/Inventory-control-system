import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inventory & Stock Control',
  description: 'Inventory and stock control application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}