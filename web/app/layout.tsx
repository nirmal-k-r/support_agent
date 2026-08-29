import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getSessionUser, isStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: "My Support",
  description: "Support ticket management platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body>
        <Nav user={user} isStaff={isStaff(user?.role)} />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
