// Activity tracking utility for client-side events

const API_BASE = process.env.REACT_APP_API_URL || '/api';

interface TrackingEvent {
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  data?: Record<string, any>;
}

interface PageViewEvent {
  page_name: string;
  time_spent?: number;
  scroll_depth?: number;
}

interface ErrorEvent {
  error_type: string;
  error_message: string;
  error_stack?: string;
  page_name?: string;
}

let pageStartTime = Date.now();
let maxScrollDepth = 0;

// Track page views
export const trackPageView = async (event: PageViewEvent) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch(`${API_BASE}/tracking/page-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        page_name: event.page_name,
        time_spent: event.time_spent || (Date.now() - pageStartTime) / 1000,
        scroll_depth: event.scroll_depth,
      }),
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

// Track feature usage
export const trackFeatureUsage = async (featureName: string) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch(`${API_BASE}/tracking/feature-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ feature_name: featureName }),
    });
  } catch (error) {
    console.error('Failed to track feature usage:', error);
  }
};

// Track custom events
export const trackEvent = async (event: TrackingEvent) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch(`${API_BASE}/tracking/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Track errors from client
export const trackError = async (error: ErrorEvent) => {
  try {
    await fetch(`${API_BASE}/tracking/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error_type: error.error_type,
        error_message: error.error_message,
        error_stack: error.error_stack,
        page_name: error.page_name,
      }),
    });
  } catch (err) {
    console.error('Failed to track error:', err);
  }
};

// Initialize scroll tracking
export const initScrollTracking = () => {
  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight > 0) {
      const scrollDepth = (window.scrollY / scrollHeight) * 100;
      maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);
    }
  });
};

// Initialize error tracking
export const initErrorTracking = () => {
  window.addEventListener('error', (event) => {
    trackError({
      error_type: 'RUNTIME_ERROR',
      error_message: event.message,
      error_stack: event.error?.stack,
      page_name: window.location.pathname,
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError({
      error_type: 'UNHANDLED_REJECTION',
      error_message: String(event.reason),
      page_name: window.location.pathname,
    });
  });
};

// Get scroll depth before leaving page
export const getScrollDepth = (): number => maxScrollDepth;

// Reset on new page
export const resetPageMetrics = () => {
  pageStartTime = Date.now();
  maxScrollDepth = 0;
};
