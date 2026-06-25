import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import ThemeProvider from "@/components/ThemeProvider";
import Header from "@/components/Header";
import { getSettings } from "@/lib/settings";
import { getAllProjects } from "@/lib/projects";
import "./globals.css";

export function generateMetadata(): Metadata {
  const settings = getSettings();
  const title = settings.metadata.seo?.site_title || settings.metadata.site_title;
  const description =
    settings.metadata.seo?.site_description || settings.metadata.site_description;
  const siteUrl = settings.metadata.site_url;
  const previewProject = getAllProjects().find((project) => project.muxPlaybackId);
  const previewImage = previewProject?.images[0]?.src;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${settings.metadata.site_title}`,
    },
    description,
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: settings.metadata.site_title,
      type: "website",
      images: previewImage
        ? [
            {
              url: previewImage,
              alt: previewProject?.title || settings.metadata.site_title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: previewImage ? [previewImage] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = getSettings();

  return (
    <html lang={settings.i18n.site_language || "en"} suppressHydrationWarning>
      <body className={`${GeistSans.className} min-h-screen`}>
        <ThemeProvider>
          <Header
            title={settings.metadata.site_title}
            enableDarkMode={settings.theme.theme_features.enable_dark_mode}
            email={settings.metadata.site_email}
            socialUrl={settings.metadata.site_social_url}
            socialTitle={settings.i18n.site_social_title}
          />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
