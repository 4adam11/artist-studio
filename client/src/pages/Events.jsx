import { api } from '../api.js';
import NewsletterForm from '../components/NewsletterForm.jsx';
import { ErrorNotice, Loading } from '../components/Status.jsx';
import { formatDateRange, todayISO } from '../format.js';
import { useApi } from '../useApi.js';
import { usePageTitle } from '../usePageTitle.js';

export default function Events() {
  usePageTitle('Events');
  const { data: events, error, loading, reload } = useApi(api.getEvents);
  const today = todayISO();
  const upcoming = events?.filter((event) => (event.endDate || event.date) >= today) || [];
  const past = events?.filter((event) => (event.endDate || event.date) < today).reverse() || [];

  return (
    <section className="page narrow">
      <h1>Events</h1>
      <p className="muted">Markets, exhibitions and workshops where you can see the work in person.</p>
      {error && <ErrorNotice message={error} onRetry={reload} />}
      {loading && <Loading />}

      {events && (
        <>
          <h2>Upcoming</h2>
          {upcoming.length ? upcoming.map((event) => <EventItem key={event.id} event={event} />) : (
            <div className="panel">
              <p>No events planned right now. Join the studio letter to hear about the next one.</p>
              <NewsletterForm source="events" compact />
            </div>
          )}
          {past.length > 0 && (
            <>
              <h2>Past events</h2>
              {past.map((event) => <EventItem key={event.id} event={event} past />)}
            </>
          )}
        </>
      )}
    </section>
  );
}

function EventItem({ event, past = false }) {
  const [, month, day] = event.date.split('-');
  const monthName = new Date(2000, Number(month) - 1, 1).toLocaleDateString(undefined, { month: 'short' });

  return (
    <article className={`event ${past ? 'event-past' : ''}`}>
      <div className="event-badge" aria-hidden="true">
        <span>{monthName}</span>
        <strong>{Number(day)}</strong>
      </div>
      <div>
        <h3>{event.title}</h3>
        <p className="event-date">{formatDateRange(event.date, event.endDate)}</p>
        <p className="muted">{event.location}</p>
        {event.description && <p>{event.description}</p>}
        {event.link && !past && <a href={event.link} className="text-link" target="_blank" rel="noopener noreferrer">Event details</a>}
      </div>
    </article>
  );
}
