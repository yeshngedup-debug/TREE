import type { Metadata } from "next";
import { AdminConsole } from "@/features/admin/admin-console";

export const metadata: Metadata = {
  title: "Staff console · BI Tree",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
