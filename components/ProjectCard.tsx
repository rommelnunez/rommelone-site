import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/types";
import { getMuxThumbnail } from "@/lib/mux";

interface ProjectCardProps {
  project: Project;
  priority?: boolean;
}

export default function ProjectCard({
  project,
  priority = false,
}: ProjectCardProps) {
  const firstImage = project.images[0]?.src;
  const muxThumb = getMuxThumbnail(project.muxPlaybackId);
  const thumbnail = firstImage || muxThumb;

  if (!thumbnail) return null;

  // Extract a short role from description (e.g. "PRODUCER" or "DIRECTOR")
  const role = project.description?.replace(/<[^>]*>/g, "").trim().split("\n")[0] || "";

  return (
    <Link
      href={`/project/${project.slug}`}
      className="project-card block group relative"
    >
      {/* 16:9 thumbnail */}
      <div className="project-card-thumb relative aspect-video overflow-hidden bg-[var(--color-surface)]">
        <Image
          src={thumbnail}
          alt={project.images[0]?.caption || project.title}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading={priority ? "eager" : "lazy"}
          unoptimized
        />

        {/* Hover overlay — gradient + text */}
        <div className="card-overlay absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-4">
          {project.muxPlaybackId && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <span className="text-white text-lg ml-0.5">&#9654;</span>
              </div>
            </div>
          )}
          <span className="text-white text-xs font-semibold tracking-wide leading-tight">
            {project.title}
          </span>
          {role && (
            <span className="text-white/60 text-[10px] tracking-[0.1em] uppercase mt-0.5">
              {role}
            </span>
          )}
        </div>
      </div>

      {/* Title below card — always visible */}
      <div className="mt-2 mb-1">
        <span className="text-[11px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors duration-300 leading-tight line-clamp-1">
          {project.title}
        </span>
        {project.year && (
          <span className="text-[10px] text-[var(--color-text-muted)] opacity-50 ml-2">
            {project.year}
          </span>
        )}
      </div>
    </Link>
  );
}
