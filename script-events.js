// ===== CONFIG =====
const API_KEY = "AIzaSyBwEAUsQj7taZRduINFbX2-X2A1xnhBIro";
const CALENDAR_ID = "newlifeumc1@gmail.com"; // public calendar id/email
const TIME_ZONE = "America/New_York";

// ===== DOM =====
const eventsListEl = document.getElementById("eventsList");
const eventsStateEl = document.getElementById("eventsState");
const eventCountEl = document.getElementById("eventCount");
const refreshBtn = document.getElementById("refreshEvents");

// ===== HELPERS =====
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateBadge(date) {
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate();
  return { month, day };
}

// ✅ FIXED: all-day date parsing so it doesn't shift back a day in some timezones
function parseEventTime(ev) {
  const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);

  // Timed events (safe to parse normally)
  if (!isAllDay) {
    const startRaw = ev.start?.dateTime;
    const endRaw = ev.end?.dateTime;
    return {
      start: startRaw ? new Date(startRaw) : null,
      end: endRaw ? new Date(endRaw) : null,
      isAllDay: false,
    };
  }

  // All-day events return date-only strings like "2026-03-23"
  // Parsing "YYYY-MM-DD" with new Date() treats it as UTC midnight → can display previous day locally.
  const parseLocalDate = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return null;
    const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
    return new Date(y, m - 1, d); // local midnight
  };

  const start = parseLocalDate(ev.start?.date);
  const end = parseLocalDate(ev.end?.date); // Google uses exclusive end date for all-day events
  return { start, end, isAllDay: true };
}

function formatRange({ start, end, isAllDay }) {
  if (!start) return "Time TBD";

  // For all-day events, Google returns end date as the NEXT day (exclusive).
  // We'll show only the start date for simplicity.
  const datePart = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (isAllDay) return `${datePart} (All day)`;

  const timePart = `${start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} – ${end?.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  return `${datePart} • ${timePart}`;
}

function truncate(text = "", max = 160) {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "…";
}

function buildEventsUrl(maxResults) {
  const now = new Date();
  const timeMin = now.toISOString();

  // ✅ only show events in the next 30 days
  const timeMaxDate = new Date(now);
  timeMaxDate.setDate(timeMaxDate.getDate() + 30);
  const timeMax = timeMaxDate.toISOString();

  const calendar = encodeURIComponent(CALENDAR_ID);

  const params = new URLSearchParams({
    key: API_KEY,
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax, // ✅ this stops birthdays repeating for future years
    maxResults: String(maxResults),
    timeZone: TIME_ZONE,
  });

  return `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events?${params.toString()}`;
}

// ===== RENDER =====
const _htmlDiv = document.createElement("div");
function htmlToPlainText(html = "") {
  _htmlDiv.innerHTML = html;
  return (_htmlDiv.textContent || _htmlDiv.innerText || "").trim().replace(/\s+/g, " ");
}

function renderEvents(events) {
  eventsListEl.innerHTML = "";

  if (!events || events.length === 0) {
    eventsStateEl.textContent = "There are no upcoming events.";
    return;
  }

  eventsStateEl.textContent = "";

  const cards = events.map((ev) => {
    const title = escapeHtml(ev.summary || "Untitled Event");
    const location = escapeHtml(ev.location || "");
    const cleanDesc = htmlToPlainText(ev.description || "");
    const description = escapeHtml(truncate(cleanDesc, 180));
    const link = ev.htmlLink || "";

    const { start, end, isAllDay } = parseEventTime(ev);
    const range = escapeHtml(formatRange({ start, end, isAllDay }));

    const badge = start ? formatDateBadge(start) : { month: "TBD", day: "" };

    return `
      <article class="event-card">
        <div class="event-date" aria-hidden="true">
          <div class="m">${badge.month}</div>
          <div class="d">${badge.day}</div>
        </div>

        <div class="event-body">
          <h2 class="event-title">${title}</h2>

          <div class="event-meta">
            <span><i class="fa-regular fa-clock"></i> ${range}</span>
            ${location ? `<span><i class="fa-solid fa-location-dot"></i> ${location}</span>` : ""}
          </div>

          ${description ? `<p class="event-desc">${description}</p>` : ""}

          ${link
        ? `<div class="event-actions">
                   <a href="${link}" target="_blank" rel="noopener">
                     View in Google Calendar <i class="fa-solid fa-arrow-up-right-from-square"></i>
                   </a>
                 </div>`
        : ""
      }
        </div>
      </article>
    `;
  });

  eventsListEl.innerHTML = cards.join("");
}

// ===== FETCH =====
async function loadEvents() {
  const maxResults = Number(eventCountEl?.value || 6);

  if (!API_KEY || API_KEY.includes("PASTE_YOUR_API_KEY_HERE")) {
    eventsStateEl.textContent =
      "Missing API key. Paste your Google API key into script-events.js.";
    return;
  }

  eventsStateEl.textContent = "Loading events…";
  eventsListEl.innerHTML = "";

  try {
    const url = buildEventsUrl(maxResults);
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    renderEvents(data.items || []);
  } catch (err) {
    console.error(err);
    eventsStateEl.textContent =
      "Unable to load events right now. Please try again later.";
  }
}

// ===== EVENTS =====
refreshBtn?.addEventListener("click", loadEvents);
eventCountEl?.addEventListener("change", loadEvents);

// Auto-load
loadEvents();