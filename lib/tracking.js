// Activity tracking for user interactions
// Stores in-memory (use database in production)

let activities = [];
let sessionMap = new Map(); // Map contact names to sessions

export function startSession(contact) {
  const sessionId = `${contact}-${Date.now()}`;
  sessionMap.set(contact, {
    sessionId,
    contact,
    startTime: Date.now(),
    startTimeISO: new Date().toISOString(),
    events: [],
  });
  return sessionId;
}

export function trackEvent(contact, eventType, details = {}) {
  const session = sessionMap.get(contact);
  if (!session) {
    console.warn(`No session found for contact: ${contact}`);
    return;
  }

  const event = {
    timestamp: Date.now(),
    time: new Date().toISOString(),
    type: eventType,
    details,
  };

  session.events.push(event);

  // Also add to global activities
  activities.push({
    contact,
    sessionId: session.sessionId,
    ...event,
  });

  console.log(`[TRACK] ${contact} - ${eventType}`, details);
}

export function getActivities() {
  return activities;
}

export function getSessionActivities(contact) {
  const session = sessionMap.get(contact);
  if (!session) return [];
  return session.events;
}

export function clearActivities() {
  const count = activities.length;
  activities = [];
  sessionMap.clear();
  return { message: `Cleared ${count} activity records` };
}

export function getDetailedReport(contact) {
  const session = sessionMap.get(contact);
  if (!session) return null;

  const sessionDuration = Date.now() - session.startTime;
  const panelEvents = session.events.filter((e) => e.type === 'panel_view');
  const inputEvents = session.events.filter((e) => e.type === 'input_change');

  const panelViews = {};
  panelEvents.forEach((e) => {
    const panel = e.details.panel;
    if (!panelViews[panel]) {
      panelViews[panel] = { count: 0, firstView: e.time, lastView: e.time };
    }
    panelViews[panel].count++;
    panelViews[panel].lastView = e.time;
  });

  return {
    contact: session.contact,
    sessionId: session.sessionId,
    startTime: session.startTimeISO,
    sessionDurationMs: sessionDuration,
    sessionDurationMins: Math.round(sessionDuration / 1000 / 60),
    totalEvents: session.events.length,
    panelViews,
    inputChanges: inputEvents.length,
    timeline: session.events,
  };
}
