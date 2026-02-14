import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Decision Gate Console",
  description: "Enterprise decision review console for AI action gating"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
