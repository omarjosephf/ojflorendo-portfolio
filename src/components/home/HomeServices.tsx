import { positioning } from "@/data/positioning";
import { HomeSection } from "@/components/home/HomeSection";

const { services } = positioning;
const [lead, ...rest] = services.offers;
const detailed = rest.filter((offer) => offer.includes.length > 0);
const oneLiners = rest.filter((offer) => offer.includes.length === 0);

function Status({ label }: { label: string }) {
  return (
    <p className="jf-status">
      <span className="jf-status-dot" aria-hidden="true" />
      {label}
    </p>
  );
}

/**
 * The owner's order (ADR-0029 D3). The lead offer gets the room; the next two
 * are rows; websites stay one line, as decided. Every offer shows its §6.2
 * label beside its title.
 */
export function HomeServices() {
  return (
    <HomeSection id="services" title="What I build for you" intro={services.intro}>
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
        {detailed.map((offer) => (
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
        {oneLiners.map((offer) => (
          <article key={offer.title} className="jf-offer-row jf-offer-row-short">
            <div>
              <h3 className="jf-offer-title">{offer.title}</h3>
              <Status label={offer.status} />
            </div>
            <p className="jf-offer-text">{offer.description}</p>
          </article>
        ))}
      </div>

      <div className="jf-notes">
        <p>{services.scopeNote}</p>
        <p>{services.relatedWork}</p>
      </div>
    </HomeSection>
  );
}
