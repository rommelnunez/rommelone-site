"use client";

import { useState, useMemo } from "react";
import ProjectCard from "./ProjectCard";
import FilterNav, { type Filter } from "./FilterNav";
import type { Project } from "@/lib/types";

interface ProjectGridProps {
  projects: Project[];
}

export default function ProjectGrid({ projects }: ProjectGridProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    if (filter === "videos") return projects.filter((p) => !!p.muxPlaybackId);
    return projects.filter((p) => !p.muxPlaybackId);
  }, [projects, filter]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      videos: projects.filter((p) => !!p.muxPlaybackId).length,
      photos: projects.filter((p) => !p.muxPlaybackId).length,
    }),
    [projects]
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="px-6 sm:px-8 py-5 border-b border-[var(--color-border)]">
        <FilterNav active={filter} onChange={setFilter} counts={counts} />
      </div>

      {/* Grid */}
      <div className="px-6 sm:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
          {filtered.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              priority={i < 6}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-[var(--color-text-muted)] text-sm py-20">
            No projects found.
          </p>
        )}
      </div>
    </div>
  );
}
