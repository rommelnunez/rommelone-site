import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllSlugs, getProjectBySlug } from "@/lib/projects";
import { getSettings } from "@/lib/settings";
import VideoEmbed from "@/components/VideoEmbed";
import { remark } from "remark";
import html from "remark-html";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: project.seo?.title || project.title,
    description: project.seo?.description || project.description,
    robots: project.seo?.no_index ? { index: false } : undefined,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const settings = getSettings();
  const role = project.description?.replace(/<[^>]*>/g, "").trim().split("\n")[0] || "";

  let bodyHtml = "";
  if (project.body) {
    const result = await remark().use(html).process(project.body);
    bodyHtml = result.toString();
  }

  return (
    <article>
      {/* Back link */}
      <div className="px-6 sm:px-8 py-4">
        <Link
          href="/"
          className="text-[11px] tracking-[0.1em] uppercase text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          &larr; Back
        </Link>
      </div>

      {/* Video embed — full width */}
      {project.muxPlaybackId && (
        <div className="bg-black w-full">
          <VideoEmbed playbackId={project.muxPlaybackId} />
        </div>
      )}

      {/* Project info */}
      <header className="px-6 sm:px-8 py-8 max-w-4xl">
        <h1 className="text-lg sm:text-xl font-semibold tracking-wide">
          {project.title}
        </h1>
        <div className="flex items-center gap-4 mt-2">
          {role && (
            <span className="text-[11px] tracking-[0.1em] uppercase text-[var(--color-text-muted)]">
              {role}
            </span>
          )}
          {project.year && settings.theme.theme_features.show_project_year && (
            <span className="text-[11px] text-[var(--color-text-muted)] opacity-50">
              {project.year}
            </span>
          )}
        </div>
      </header>

      {/* Images */}
      {project.images.length > 0 && (
        <section className="px-6 sm:px-8 space-y-1 pb-8">
          {project.images.map((img, i) => (
            <Image
              key={i}
              src={img.src}
              alt={img.caption || project.title}
              width={1800}
              height={1200}
              sizes="100vw"
              className="w-full h-auto"
              loading={i === 0 ? "eager" : "lazy"}
              unoptimized
            />
          ))}
        </section>
      )}

      {/* Body / credits */}
      {bodyHtml && (
        <div className="px-6 sm:px-8 pb-16 max-w-2xl">
          <div
            className="text-xs leading-relaxed text-[var(--color-text-muted)] [&_a]:text-[var(--color-text)] [&_a:hover]:underline"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      )}
    </article>
  );
}
