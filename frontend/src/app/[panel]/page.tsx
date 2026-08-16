import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminApp from "@/components/admin/AdminApp";

const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_PANEL_SLUG || "cgs-ctrl-a7f8e2d1b9c4k6m3";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "CGS Control Vault",
    robots: { index: false, follow: false },
  };
}

export default async function AdminPanelPage({
  params,
}: {
  params: Promise<{ panel: string }>;
}) {
  const { panel } = await params;
  // The vault lives at exactly one non-dictionary URL. Every other slug
  // renders a plain 404 so the panel stays undiscoverable.
  if (panel !== ADMIN_SLUG) {
    notFound();
  }
  return <AdminApp />;
}
