import { getProjectBySlug } from "@/lib/projects";
import FocusViewModal from "@/components/FocusViewModal";
import { notFound } from "next/navigation";

export default async function ModalProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return <FocusViewModal project={project} />;
}
