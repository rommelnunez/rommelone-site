import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { slugify } from "./slugify";
import type { Project } from "./types";

const projectsDir = path.join(process.cwd(), "projects");

function parseProject(filePath: string): Project | null {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  if (data.draft) return null;

  return {
    slug: slugify(data.title),
    title: data.title,
    description: data.description || "",
    muxPlaybackId: data.mux_playback_id || null,
    year: data.year || null,
    images: (data.images || []).filter(
      (img: { src?: string }) => img && img.src
    ),
    projectType: data.project_type || null,
    position: data.position ?? 0,
    draft: data.draft ?? false,
    date: data.date ? new Date(data.date).toISOString() : "",
    body: content,
    seo: data.seo || undefined,
  };
}

export const getAllProjects = cache((): Project[] => {
  const files = fs
    .readdirSync(projectsDir)
    .filter((f) => f.endsWith(".md"));

  const projects: Project[] = [];
  for (const file of files) {
    const project = parseProject(path.join(projectsDir, file));
    if (project) projects.push(project);
  }

  return projects.sort((a, b) => a.position - b.position);
});

export const getProjectBySlug = cache(
  (slug: string): Project | undefined => {
    return getAllProjects().find((p) => p.slug === slug);
  }
);

export const getAllSlugs = cache((): string[] => {
  return getAllProjects().map((p) => p.slug);
});
