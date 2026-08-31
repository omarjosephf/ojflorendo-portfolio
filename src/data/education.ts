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
 * `certificatePath` is the primary evidence for every credential. The owner
 * decided on 31 August 2026 to publish the certificate documents unredacted,
 * accepting that they display his legal name, "for transparency and trust with
 * my future clients/audience".
 *
 * That decision replaced the earlier policy recorded here, which linked only to
 * issuer verification pages in order to keep documents bearing the legal name
 * off this domain. The earlier policy left three of six credentials with no
 * evidence at all, which undercut the transparency the section exists to
 * provide. Handbook 6.1 permits this: issuer records must be preserved exactly
 * as issued, and public copy may state that a credential displays a legal name.
 * The Credentials section discloses the name difference in copy rather than
 * hiding it.
 *
 * `verificationUrl` is now secondary and additional. It is present only where
 * the issuer publishes a real verification page; an issuer-hosted page cannot be
 * forged, so it is worth showing alongside the document. Most training providers
 * issue a PDF and nothing else, which is ordinary.
 *
 * Every entry must carry a `certificatePath` — `src/data/education.test.ts`
 * enforces this so a future edit cannot silently leave a credential unevidenced.
 */
export const certifications: CertificationItem[] = [
  {
    title: "PCEP – Certified Entry-Level Python Programmer",
    issuer: "Python Institute",
    date: "July 2025",
    category: "Professional certification",
    certificatePath: "/documents/certificates/pcep-python-institute-2025.pdf",
    verificationUrl:
      "https://www.credly.com/badges/b5083af9-8ffe-4e08-9a86-44737803367e/public_url",
  },
  {
    title: "Business Intelligence: Data Analysis and Reporting Techniques",
    issuer: "London Premier Centre",
    date: "June 2025",
    category: "Professional training",
    certificatePath: "/documents/certificates/business-intelligence-lpc-2025.pdf",
  },
  {
    title: "Certified UX/UI Designer Bootcamp",
    issuer: "School of UX Design, UK",
    date: "July 2023",
    category: "Professional training",
    certificatePath:
      "/documents/certificates/ux-ui-designer-bootcamp-school-of-ux-design-2023.pdf",
  },
  {
    title: "Analyze Data with Microsoft Excel",
    issuer: "Codecademy",
    date: "July 2025",
    category: "Additional professional development",
    certificatePath:
      "/documents/certificates/analyze-data-with-excel-codecademy-2025.pdf",
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
    certificatePath:
      "/documents/certificates/prompt-engineering-dubai-future-foundation-2025.pdf",
  },
  {
    title: "The Art of Storytelling",
    issuer: "IESE Business School, University of Navarra",
    date: "July 2025",
    category: "Additional professional development",
    certificatePath: "/documents/certificates/art-of-storytelling-iese-2025.pdf",
    verificationUrl:
      "https://www.coursera.org/account/accomplishments/verify/9WSR9EX8UQ25",
  },
];
