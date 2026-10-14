import Link from "next/link";
import { positioning } from "@/data/positioning";
import { getProjectBySlug } from "@/data/projects";
import { HomeSection } from "@/components/home/HomeSection";
import { AskEvButton } from "@/components/home/AskEvButton";

const { work } = positioning;

function caseStudyLabel(slug: string) {
  const project = getProjectBySlug(slug);
  return `Read the ${project?.title ?? slug} case study`;
}

function Kind({ kind, status }: { kind: string; status: string }) {
  const live = status === "Live";
  return (
    <p className="jf-work-kind">
      <span className={live ? "jf-status-dot" : "jf-status-dot jf-status-dot-hollow"} aria-hidden="true" />
      {`${status}: ${kind}`}
    </p>
  );
}

/**
 * Five real pieces of work at different sizes, because they are not equal:
 * Cited carries a published measurement, the blog shows the agent chain, E.V is
 * on this page, Learn Your Way is unfinished and says so, and the portfolio is
 * the site itself. Case-study links keep their established accessible names.
 */
export function Work() {
  const { cited, blog, ev, learnYourWay, portfolio } = work;
  return (
    <HomeSection id="projects" title={work.heading} intro={work.intro}>
      <div className="jf-work">
        <article className="jf-work-feature" aria-labelledby="work-cited">
          <div className="jf-work-feature-copy">
            <h3 id="work-cited" className="jf-work-title jf-work-title-large">{cited.title}</h3>
            <Kind kind={cited.kind} status={cited.status} />
            <p className="jf-work-text">{cited.summary}</p>
            <p className="jf-work-fact">{cited.fact}</p>
            <div className="jf-work-links">
              <a href={cited.demoUrl} target="_blank" rel="noopener noreferrer" className="jf-button">
                Try the live demo
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <Link
                href={`/projects/${cited.caseStudySlug}`}
                className="jf-text-link"
                aria-label={caseStudyLabel(cited.caseStudySlug)}
              >
                Read the case study
              </Link>
            </div>
          </div>
          <div className="jf-work-shot">
            <img
              src={cited.image}
              alt=""
              width={1104}
              height={320}
              loading="lazy"
              decoding="async"
            />
          </div>
        </article>

        <article className="jf-work-card jf-work-blog" aria-labelledby="work-blog">
          <h3 id="work-blog" className="jf-work-title">{blog.title}</h3>
          <Kind kind={blog.kind} status={blog.status} />
          <p className="jf-work-text">{blog.summary}</p>
          <ol className="jf-chain" aria-label="Who handles each post, in order">
            {blog.agents.map((agent) => (
              <li key={agent}>{agent}</li>
            ))}
            <li className="jf-chain-owner">{blog.approver}</li>
          </ol>
          <Link href={blog.href} className="jf-text-link">
            Read the blog
          </Link>
        </article>

        <article className="jf-work-card" aria-labelledby="work-ev">
          <h3 id="work-ev" className="jf-work-title">{ev.title}</h3>
          <Kind kind={ev.kind} status={ev.status} />
          <p className="jf-work-text">{ev.summary}</p>
          <AskEvButton label="Ask E.V" className="jf-text-link jf-text-button" />
        </article>

        <article className="jf-work-card jf-work-pending" aria-labelledby="work-lyw">
          <h3 id="work-lyw" className="jf-work-title">{learnYourWay.title}</h3>
          <Kind kind={learnYourWay.kind} status={learnYourWay.status} />
          <p className={learnYourWay.summary.startsWith("[") ? "jf-work-text jf-placeholder" : "jf-work-text"}>{learnYourWay.summary}</p>
          <p className="jf-fine jf-work-note">{learnYourWay.note}</p>
        </article>

        <article className="jf-work-card" aria-labelledby="work-portfolio">
          <h3 id="work-portfolio" className="jf-work-title">{portfolio.title}</h3>
          <Kind kind={portfolio.kind} status={portfolio.status} />
          <p className="jf-work-text">{portfolio.summary}</p>
          <div className="jf-work-links">
            <Link
              href={`/projects/${portfolio.caseStudySlug}`}
              className="jf-text-link"
              aria-label={caseStudyLabel(portfolio.caseStudySlug)}
            >
              Read the case study
            </Link>
            <a href={portfolio.sourceUrl} target="_blank" rel="noopener noreferrer" className="jf-text-link">
              Source on GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </article>
      </div>
    </HomeSection>
  );
}
