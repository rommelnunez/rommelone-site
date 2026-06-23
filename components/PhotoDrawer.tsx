"use client";

import Link from "next/link";
import type { Project } from "@/lib/types";
import ProgressiveImage from "./ProgressiveImage";

interface PhotoDrawerProps {
  projects: Project[];
}

export default function PhotoDrawer({ projects }: PhotoDrawerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
      {projects.map((project) => {
        const thumb = project.images[0]?.src;
        if (!thumb) return null;

        return (
          <Link
            key={project.slug}
            href={`/project/${project.slug}`}
            className="group block relative aspect-square overflow-hidden bg-[#111]"
          >
            <ProgressiveImage
              src={thumb}
              alt={project.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
            {/* Title on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-4">
              <span className="text-white text-sm font-light tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {project.title}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
