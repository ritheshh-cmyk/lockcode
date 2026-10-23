import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LockApp Admin — License Management",
  description: "Manage software license keys",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
