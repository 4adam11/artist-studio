import { Link } from 'react-router';
import { formatPrice } from '../format.js';
import { useStudio } from '../state/StudioContext.jsx';
import { usePageTitle } from '../usePageTitle.js';

// Starter wording for the help pages. Edit the text here to match how the
// studio actually works; shipping prices come from the admin settings.

export function ShippingReturns() {
  usePageTitle('Shipping & returns');
  const { settings, config } = useStudio();
  const money = (amount) => formatPrice(amount, config.currency);

  return (
    <section className="page narrow prose">
      <h1>Shipping &amp; returns</h1>

      <h2>Shipping</h2>
      <ul>
        <li>
          {settings.shippingFlat > 0 ? <>Shipping is a flat <strong>{money(settings.shippingFlat)}</strong> per order</> : <>Shipping is <strong>free</strong></>}
          {settings.freeShippingOver > 0 && <>, and <strong>free on orders over {money(settings.freeShippingOver)}</strong></>}.
        </li>
        {settings.processingTime && <li>{settings.processingTime}.</li>}
        {settings.shipsTo && <li>{settings.shipsTo}.</li>}
        <li>Every piece is wrapped by hand in tissue and recycled packaging.</li>
        <li>You'll get an email with a tracking number as soon as your order ships.</li>
      </ul>

      <h2>Returns</h2>
      <p>
        I want you to love your piece. If something isn't right, contact me within <strong>14 days</strong> of delivery
        and we'll arrange a return. Items should be unused and in their original condition; the buyer pays return
        shipping unless the item arrived damaged.
      </p>
      <p>Commissioned pieces are made just for you, so they can't be returned, but I'll always work with you to make sure you're happy before your piece ships.</p>

      <h2>Damaged in transit?</h2>
      <p>Please send a photo within 3 days of delivery and I'll make it right with a repair, replacement or refund.</p>

      <p>Questions? <Link to="/contact" className="text-link">Get in touch</Link>.</p>
    </section>
  );
}

const FAQ = [
  ['Is every piece really handmade?', 'Yes. Every painting, stitch and loop is made by hand in the studio, which is why no two pieces are exactly alike.'],
  ['Can I order a piece in different colours or sizes?', 'Absolutely. That is exactly what commissions are for. Tell me your idea on the commissions page and I will send you a quote.'],
  ['How long does a commission take?', 'Most commissions take 2–6 weeks depending on size and complexity. I will give you a timeline with your quote.'],
  ['How do I care for crochet pieces?', 'Hand wash in cold water with a gentle wool wash, press out the water with a towel and dry flat. Care instructions for each piece are on its product page.'],
  ['How do I care for fabric paintings?', 'Keep them out of strong direct sunlight and dust gently with a soft brush. Avoid washing painted pieces.'],
  ['Do you ship internationally?', 'Yes. Shipping costs are shown at checkout before you pay.'],
  ['Can I see the work in person?', 'Yes! Check the events page for upcoming markets and exhibitions.'],
  ['What payment methods do you accept?', 'Major cards through secure checkout. If online payment isn\'t available, I\'ll email you payment details after you order.']
];

export function Faq() {
  usePageTitle('FAQ');
  return (
    <section className="page narrow">
      <h1>Frequently asked questions</h1>
      <div className="accordion accordion-large">
        {FAQ.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <p>Still have a question? <Link to="/contact" className="text-link">Send me a message</Link>.</p>
    </section>
  );
}
