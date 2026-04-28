import { getAllProjects } from "@/lib/projects";
import { getSettings } from "@/lib/settings";
import ProjectSlideshow from "@/components/ProjectSlideshow";

export default function Home() {
  const projects = getAllProjects();
  const settings = getSettings();
  const limit = settings.theme.theme_features.item_output_limit || 48;

  return (
    <ProjectSlideshow
      projects={projects.slice(0, limit)}
      siteTitle={settings.metadata.site_title}
    />
  );
}
