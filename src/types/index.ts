/** Central type definitions for the portfolio content model. */

export type IconName = "github" | "linkedin" | "email";

export interface SocialLink {
  label: string;
  href: string;
  icon: IconName;
  ariaLabel: string;
  external: boolean;
}

export interface NavigationItem {
  label: string;
  targetId: string;
}

export interface SkillGroup {
  title: string;
  summary: string;
  skills: string[];
}

export interface ExperienceItem {
  role: string;
  organisation: string;
  location: string;
  period: string;
  current: boolean;
  responsibilities: string[];
}

export interface EducationItem {
  qualification: string;
  institution: string;
  period: string;
  detail?: string;
}

export type CredentialCategory =
  | "Professional certification"
  | "Professional training"
  | "Additional professional development";

export interface CertificationItem {
  title: string;
  issuer: string;
  date: string;
  category: CredentialCategory;
  verificationUrl?: string;
  certificatePath?: string;
}

export interface CaseStudyChallenge {
  title: string;
  body: string;
}

export interface CaseStudy {
  tagline: string;
  overview: string;
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
  image: string | null;
  liveUrl: string | null;
  githubUrl: string | null;
  featured: boolean;
  ariaLabel: string;
  caseStudy?: CaseStudy;
}

export interface NowItem {
  iconKey: "study" | "build" | "portfolio" | "learn";
  title: string;
  description: string;
}

export interface NowData {
  updated: string;
  items: NowItem[];
  personalNote?: string;
}

export interface SiteConfig {
  name: string;
  headline: string;
  descriptor: string;
  location: string;
  email: string;
  about: string[];
  cvPath: string | null;
  profileImage: string | null;
  socials: SocialLink[];
  nav: NavigationItem[];
}
