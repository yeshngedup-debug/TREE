import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface";
import { AdminConsole } from "@/features/admin/admin-console";

export const metadata: Metadata = {
  title: "Staff console · BI Tree",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <SurfaceShell tool>
      <AdminConsole />
    </SurfaceShell>
  );
}
