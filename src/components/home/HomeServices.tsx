import { positioning } from "@/data/positioning";
import { HomeSection } from "@/components/home/HomeSection";

const { services } = positioning;
const [lead, ...rest] = services.offers;

function Status({ label }: { label: string }) {
  return (
    <p className="jf-status">
      <span className="jf-status-dot" aria-hidden="true" />
      {label}
    </p>
  );
}

/** The total the client pays, then the terms that go with it. */
function Price({ price, detail }: { price: string; detail: string }) {
  return (
    <div className="jf-offer-price">
      <p className="jf-offer-price-amount">{price}</p>
      <p className="jf-offer-price-detail">{detail}</p>
    </div>
  );
}

/**
 * The owner's order (ADR-0031). The build check is the lead offer and gets the
 * room; the next three are rows. Every offer shows its §6.2 label and its
 * approved price beside its title.
 */
export function HomeServices() {
  return (
    <HomeSection id="services" title="Services and prices" intro={services.intro}>
      <article className="jf-offer-lead" aria-labelledby="offer-lead-title">
        <div className="jf-offer-lead-copy">
          <h3 id="offer-lead-title" className="jf-offer-lead-title">{lead.title}</h3>
          <Status label={lead.status} />
          <Price price={lead.price} detail={lead.priceDetail} />
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
              <Price price={offer.price} detail={offer.priceDetail} />
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
    </HomeSection>
  );
}
