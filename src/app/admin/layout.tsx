import type { ReactNode } from "react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { getAdminActor } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await getAdminActor();
  return <AdminFrame role={actor?.role}>{children}</AdminFrame>;
}
