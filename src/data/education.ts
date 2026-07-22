import type { CertificationItem, EducationItem } from "@/types";

/** Verified education (CLAUDE.md §4). */
export const education: EducationItem[] = [
  {
    qualification: "BSc (Honours) Computing and IT (Software)",
    institution: "The Open University",
    period: "2023 – Expected 2026",
    detail:
      "Final-year student focusing on software, computing, data and AI-related skills.",
  },
  {
    qualification: "High School Diploma in General Science",
    institution: "Penn Foster High School, USA",
    period: "2019 – 2023",
    detail: "GPA 3.8 / 4.0.",
  },
];

/** Verified certifications and professional development (CLAUDE.md §4). */
export const certifications: CertificationItem[] = [
  {
    title: "PCEP – Certified Entry-Level Python Programmer",
    issuer: "Python Institute",
    date: "July 2025",
  },
  {
    title: "Business Intelligence: Data Analysis and Reporting Techniques",
    issuer: "London Premier Centre",
    date: "June 2025",
  },
  {
    title: "Analyze Data with Microsoft Excel",
    issuer: "Codecademy",
    date: "July 2025",
  },
  {
    title: "One Million Prompters: Prompt Engineering",
    issuer: "Dubai Future Foundation",
    date: "July 2025",
  },
  {
    title: "The Art of Storytelling",
    issuer: "IESE Business School, University of Navarra",
    date: "July 2025",
  },
  {
    title: "Certified UX/UI Designer Bootcamp",
    issuer: "School of UX Design, UK",
    date: "July 2023",
  },
];
