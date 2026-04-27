import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "In-Memory Checkbook Custom Sheet Demo",
  description: "Demo app for custom sheets and a sample checkbook using in-memory data storage"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
