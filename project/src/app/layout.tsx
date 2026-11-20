import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Liyanna — Less paperwork. More business.",
  description:
    "Create beautiful invoices and quotations. Private on your device, with optional cloud backup and team sharing.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
