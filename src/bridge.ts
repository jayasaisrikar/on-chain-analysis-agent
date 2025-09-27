/**
 * Bridge module to export backend functions for frontend consumption
 * This avoids direct dependency conflicts between frontend and backend ADK versions
 */

import * as backendIndex from './index';

// Re-export the types and functions the frontend needs
export type AnalysisEvent = backendIndex.AnalysisEvent;
export const runAnalysis = backendIndex.runAnalysis;

// Export as default for easier importing
export default {
  runAnalysis: backendIndex.runAnalysis,
  AnalysisEvent: {} as backendIndex.AnalysisEvent, // Type placeholder
};