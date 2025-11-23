// Re-export Monitor class and all supplemental types
export { Monitor } from "./os-monitor";
export * from "./os-monitor";

// Default export: actual monitor instance
import { Monitor, ConfigObject } from "./os-monitor";
declare const monitor: Monitor;
export default monitor;

// Named factory export
export function createMonitor(
  options?: Partial<ConfigObject>
): Monitor;
