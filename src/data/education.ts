import type { CertificationItem, EducationItem } from "@/types";

export const education: EducationItem[] = [
  {
    qualification: "BSc (Honours) Computing and IT (Software)",
    institution: "The Open University",
    period: "2023 – Expected 2026",
    detail:
      "Final-year student focusing on software, computing, data, and AI-related skills.",
  },
  {
    qualification: "High School Diploma in General Science",
    institution: "Penn Foster High School, USA",
    period: "2019 – 2023",
    detail: "GPA 3.8 / 4.0.",
  },
];

/**
 * Credential titles, issuers, and dates preserve the currently verified public
 * repository record. Links and PDFs remain absent until their source artefacts
 * receive a separate privacy, metadata, and issuer review.
 */
export const certifications: CertificationItem[] = [
  {
    title: "PCEP – Certified Entry-Level Python Programmer",
    issuer: "Python Institute",
    date: "July 2025",
    category: "Professional certification",
  },
  {
    title: "Business Intelligence: Data Analysis and Reporting Techniques",
    issuer: "London Premier Centre",
    date: "June 2025",
    category: "Professional training",
  },
  {
    title: "Certified UX/UI Designer Bootcamp",
    issuer: "School of UX Design, UK",
    date: "July 2023",
    category: "Professional training",
  },
  {
    title: "Analyze Data with Microsoft Excel",
    issuer: "Codecademy",
    date: "July 2025",
    category: "Additional professional development",
  },
  {
    title: "One Million Prompters: Prompt Engineering",
    issuer: "Dubai Future Foundation",
    date: "Completed July 2025",
    category: "Additional professional development",
  },
  {
    title: "The Art of Storytelling",
    issuer: "IESE Business School, University of Navarra",
    date: "July 2025",
    category: "Additional professional development",
  },
];
