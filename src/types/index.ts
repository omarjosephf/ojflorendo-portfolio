/**
 * Central type definitions for the portfolio content model.
 * Content data (src/data/*) is kept separate from presentation (components).
 */

export type IconName = "github" | "linkedin" | "email";

export interface SocialLink {
  label: string;
  href: string;
  icon: IconName;
  /** Accessible name for screen readers, e.g. "OJ Florendo on LinkedIn (opens in a new tab)". */
  ariaLabel: string;
  /** Whether the link points off-site and should open in a new tab. */
  external: boolean;
}

export interface NavigationItem {
  label: string;
  /** In-page anchor id (without the leading #) or a route path. */
  targetId: string;
}

export interface SkillGroup {
  title: string;
  /** Short description of what this group represents. */
  summary: string;
  skills: string[];
}

export interface ExperienceItem {
  role: string;
  organisation: string;
  location: string;
  /** Human-readable date range, e.g. "Jan 2026 – Present". */
  period: string;
  /** Whether this is a current role (used for subtle styling). */
  current: boolean;
  responsibilities: string[];
}

export interface EducationItem {
  qualification: string;
  institution: string;
  period: string;
  detail?: string;
}

export interface CertificationItem {
  title: string;
  issuer: string;
  date: string;
}

export interface CaseStudyChallenge {
  title: string;
  body: string;
}

/** Reusable, data-driven case-study content for a project. */
export interface CaseStudy {
  tagline: string;
  overview: string;
  /** Context / problem the project addresses. */
  context: string;
  goals: string[];
  role: string;
  process: string[];
  architecture: string[];
  features: string[];
  accessibilitySecurity: string[];
  performance: string[];
  challenges: CaseStudyChallenge[];
  outcome: string;
  lessons: string[];
  stack: string[];
}

export type ProjectStatus = "In development" | "Live" | "Coming soon";

export interface ProjectItem {
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  technologies: string[];
  /** Public path to a preview image, or null when none exists yet. */
  image: string | null;
  /** Live site URL, or null while unavailable (link is hidden when null). */
  liveUrl: string | null;
  /** Source repository URL, or null while unavailable (link is hidden when null). */
  githubUrl: string | null;
  featured: boolean;
  /** Accessible label for any card-level link. */
  ariaLabel: string;
  /** Optional dedicated case study; when present the card links to it. */
  caseStudy?: CaseStudy;
}

export interface NowItem {
  /** Maps to an icon in the Now component (keeps data free of React imports). */
  iconKey: "study" | "build" | "portfolio" | "learn";
  title: string;
  description: string;
}

export interface NowData {
  /** Human-readable "last updated" label for the Now snapshot. */
  updated: string;
  items: NowItem[];
  /** A restrained personal note (not the primary professional focus). */
  personalNote?: string;
}

export interface SiteConfig {
  name: string;
  /** Short professional headline. */
  headline: string;
  /** Longer role descriptor / subtitle. */
  descriptor: string;
  location: string;
  email: string;
  /** First-person profile summary paragraphs. */
  about: string[];
  /** Public, phone-free CV path under /public, or null until one is supplied. */
  cvPath: string | null;
  /** Public path to a profile photo under /public, or null to use a placeholder. */
  profileImage: string | null;
  socials: SocialLink[];
  nav: NavigationItem[];
}
