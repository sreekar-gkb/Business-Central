// Anonymous session-based activity tracking utility (NO AUTHENTICATION REQUIRED)

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

/**
 * Track page views (no auth required)
 */
export const trackPageView = async (event: PageViewEvent) => {
  try {
    await fetch(`${API_BASE}/tracking/page-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

/**
 * Track feature usage (no auth required)
 */
export const trackFeatureUsage = async (featureName: string) => {
  try {
    await fetch(`${API_BASE}/tracking/feature-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feature_name: featureName }),
    });
  } catch (error) {
    console.error('Failed to track feature usage:', error);
  }
};

/**
 * Track custom events (no auth required)
 */
export const trackEvent = async (event: TrackingEvent) => {
  try {
    await fetch(`${API_BASE}/tracking/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

/**
 * Track errors from client (no auth required)
 */
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

/**
 * Initialize scroll tracking
 */
export const initScrollTracking = () => {
  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight > 0) {
      const scrollDepth = (window.scrollY / scrollHeight) * 100;
      maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);
    }
  });
};

/**
 * Initialize error tracking (global error handlers)
 */
export const initErrorTracking = () => {
  // Track runtime errors
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

/**
 * Get current scroll depth
 */
export const getScrollDepth = (): number => maxScrollDepth;

/**
 * Reset metrics for new page
 */
export const resetPageMetrics = () => {
  pageStartTime = Date.now();
  maxScrollDepth = 0;
};

/**
 * Track estimate action
 */
export const trackEstimateAction = (action: 'create' | 'update' | 'export' | 'delete', estimateId?: string) => {
  trackEvent({
    action_type: `${action}_estimate`,
    resource_type: 'estimate',
    resource_id: estimateId,
  });
};

/**
 * Track module selection
 */
export const trackModuleAction = (moduleId: string, selected: boolean) => {
  trackEvent({
    action_type: selected ? 'module_selected' : 'module_deselected',
    resource_type: 'module',
    resource_id: moduleId,
  });
};

/**
 * Track integration action
 */
export const trackIntegrationAction = (integrationId: string, action: 'add' | 'remove' | 'update') => {
  trackEvent({
    action_type: `integration_${action}`,
    resource_type: 'integration',
    resource_id: integrationId,
  });
};

/**
 * Track scenario run
 */
export const trackScenarioRun = (scenarioType: 'A' | 'B' | 'C') => {
  trackEvent({
    action_type: 'run_scenario',
    resource_type: 'scenario',
    resource_id: `scenario_${scenarioType}`,
  });
};

/**
 * Auto-track field changes (for estimator inputs)
 */
export const trackFieldChange = (fieldName: string, value: any) => {
  trackEvent({
    action_type: 'update_field',
    resource_type: 'estimate_field',
    resource_id: fieldName,
    data: { value },
  });
};
