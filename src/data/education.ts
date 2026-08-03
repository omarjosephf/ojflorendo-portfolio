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
 * repository record.
 *
 * `verificationUrl` points at issuer-hosted verification rather than a PDF in
 * `public/`. That is deliberate: an issuer page cannot be forged, and it keeps
 * documents bearing the owner's legal name off this domain. The certificates
 * still show that name on the issuer's own page, which the Credentials section
 * discloses in copy rather than hiding.
 *
 * `certificatePath` stays unused. Publishing the PDFs was considered and
 * rejected for the reason above.
 *
 * Only credentials with a genuine issuer verification page carry a link; the UI
 * hides the control for the rest, so no dead affordance is ever rendered.
 */
export const certifications: CertificationItem[] = [
  {
    title: "PCEP – Certified Entry-Level Python Programmer",
    issuer: "Python Institute",
    date: "July 2025",
    category: "Professional certification",
    verificationUrl:
      "https://www.credly.com/badges/b5083af9-8ffe-4e08-9a86-44737803367e/public_url",
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
    // This URL contains the owner's legal given names in the profile segment.
    // Included with explicit owner approval, consistent with the disclosure in
    // the Credentials section.
    verificationUrl:
      "https://www.codecademy.com/profiles/OmarJoseph/certificates/822ee70576844e219dc4d00edf39aac6",
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
    verificationUrl:
      "https://www.coursera.org/account/accomplishments/verify/9WSR9EX8UQ25",
  },
];
