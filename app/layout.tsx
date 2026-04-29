import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import ThemeProvider from "@/components/ThemeProvider";
import Header from "@/components/Header";
import { getSettings } from "@/lib/settings";
import "./globals.css";

export function generateMetadata(): Metadata {
  const settings = getSettings();
  return {
    title: {
      default: settings.metadata.seo?.site_title || settings.metadata.site_title,
      template: `%s | ${settings.metadata.site_title}`,
    },
    description:
      settings.metadata.seo?.site_description || settings.metadata.site_description,
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
