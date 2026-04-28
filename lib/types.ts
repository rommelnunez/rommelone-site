export interface ProjectImage {
  src: string;
  caption?: string;
}

export interface ProjectSeo {
  title?: string;
  description?: string;
  no_index?: boolean;
}

export interface Project {
  slug: string;
  title: string;
  description: string;
  muxPlaybackId: string | null;
  year: number | null;
  images: ProjectImage[];
  projectType: string | null;
  position: number;
  draft: boolean;
  date: string;
  body: string;
  seo?: ProjectSeo;
}

export interface ThemeColors {
  background: string;
  text: string;
  link: string;
  background_dark: string;
  text_dark: string;
  link_dark: string;
}

export interface ThemeTypography {
  font: string;
  font_weight: number;
  font_scale: number;
  line_height_scale: number;
}

export interface ThemeFeatures {
  enable_dark_mode: boolean;
  item_output_limit: number;
  transition_duration: number;
  show_project_year: boolean;
  show_project_grid_titles: boolean;
}

export interface Settings {
  metadata: {
    site_url: string;
    site_title: string;
    site_subtitle_1?: string;
    site_subtitle_2?: string;
    site_description?: string;
    site_email?: string;
    site_social_url?: string;
    site_icon_svg?: string;
    site_icon_png?: string;
    site_ga4_id?: string;
    seo?: {
      site_title?: string;
      site_description?: string;
      no_index?: boolean;
    };
  };
  theme: {
    theme_layout: { space_scale: number };
    theme_colors: ThemeColors;
    theme_typography: ThemeTypography;
    theme_features: ThemeFeatures;
  };
  i18n: {
    site_language: string;
    site_social_title?: string;
  };
}
