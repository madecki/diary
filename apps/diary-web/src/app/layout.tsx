import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diary",
  description: "Personal diary — check-ins and short notes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-primary min-h-screen text-offwhite antialiased">
        <main className="py-9">{children}</main>
      </body>
    </html>
  );
}
