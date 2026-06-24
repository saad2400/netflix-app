import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "What Should We Watch? — Netflix matchmaker for two",
  description:
    "Two people, two sets of tastes, one perfect Netflix movie. Create a session, share the code, and let the app pick what you should watch together.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-netflix-dark text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
