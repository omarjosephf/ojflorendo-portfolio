import { positioning } from "@/data/positioning";
import { HomeSection } from "@/components/home/HomeSection";

const { services } = positioning;
const [lead, ...rest] = services.offers;

function Status({ label }: { label: string }) {
  const available = label === "Available now";
  return (
    <p className="jf-status">
      <span
        className={available ? "jf-status-dot" : "jf-status-dot jf-status-dot-hollow"}
        aria-hidden="true"
      />
      {label}
    </p>
  );
}

/**
 * The owner's order (ADR-0032). Automations and workflows lead and get the
 * room; the next three are rows. Every offer shows its §6.2 label beside its
 * title. No offer carries a price: each is quoted after a free call.
 */
export function HomeServices() {
  return (
    <HomeSection id="services" title="Services" intro={services.intro}>
      <article className="jf-offer-lead" aria-labelledby="offer-lead-title">
        <div className="jf-offer-lead-copy">
          <h3 id="offer-lead-title" className="jf-offer-lead-title">{lead.title}</h3>
          <Status label={lead.status} />
          <p className="jf-offer-text">{lead.description}</p>
        </div>
        <ul className="jf-offer-includes" aria-label={`Included in ${lead.title.toLowerCase()}`}>
          {lead.includes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="jf-offer-rows">
        {rest.map((offer) => (
          <article key={offer.title} className="jf-offer-row">
            <div>
              <h3 className="jf-offer-title">{offer.title}</h3>
              <Status label={offer.status} />
            </div>
            <div>
              <p className="jf-offer-text">{offer.description}</p>
              <ul className="jf-offer-list" aria-label={`Included in ${offer.title.toLowerCase()}`}>
                {offer.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="jf-notes">
        <p>{services.scopeNote}</p>
        <p>{services.priceNote}</p>
        <p>{services.foundingNote}</p>
        <p>{services.relatedWork}</p>
      </div>

      <div className="jf-offer-action">
        <a href="#contact" className="jf-button">
          Ask for a quote
        </a>
      </div>
    </HomeSection>
  );
}
