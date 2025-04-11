import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Keep track of used colors to ensure no duplicates
const usedColors = new Set<string>();

export function getRandomColor() {
  const colors = [
    '#f59e0b', '#10b981', '#3b82f6', '#ef4444', // Primary colors (yellow, green, blue, red)
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', // Secondary (purple, pink, teal, orange)
    '#a3e635', '#6366f1', '#fcd34d', '#64748b', // Tertiary (lime, indigo, amber, slate)
    '#22d3ee', '#f43f5e', '#0ea5e9', '#84cc16'  // Accent (cyan, rose, sky, lime)
  ];
  
  // If all colors used, reset
  if (usedColors.size >= colors.length) {
    usedColors.clear();
  }
  
  // Find an unused color
  let color: string;
  do {
    color = colors[Math.floor(Math.random() * colors.length)];
  } while (usedColors.has(color));
  
  // Mark as used
  usedColors.add(color);
  return color;
}

export function formatMetricName(metric: string): string {
  if (metric === "Short Trades (won %) Count") {
    return "Short Trades";
  } else if (metric === "Short Trades (won %) Percentage") {
    return "Short Profit %";
  } else if (metric === "Long Trades (won %) Count") {
    return "Long Trades";
  } else if (metric === "Long Trades (won %) Percentage") {
    return "Long Profit %";
  } else if (metric === "Maximal position holding time") {
    return "Max Hold Time";
  } else if (metric === "Average position holding time") {
    return "Avg Hold Time";
  } else if (metric === "AvgP") {
    return "Avg Profit";
  } else if (metric === "AvgL") {
    return "Avg Loss";
  }
  return metric;
}

export function sanitizeMetricValue(metric: string, value: any): number | string {
  if (metric.includes("holding time")) {
    // For time-based metrics, return the original string format for the bar chart
    if (typeof value === 'string' && value.includes(':')) {
      return value; // Keep as string for processing in the chart
    }
    // Fallback for empty or non-string values
    return "0:00:00";
  } else {
    // For numeric metrics, parse the value
    return parseFloat((value !== undefined && value !== null) ? value : 0);
  }
}

export function formatMetricValue(metric: string, value: number | string): string {
  // Handle string values (typically time values)
  if (typeof value === 'string') {
    if (metric.includes("holding time")) {
      return value; // Return original time format like "1:23:45"
    }
    // Try to convert to number for other metrics
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    value = numValue;
  }
  
  // Handle numeric values
  if (metric.includes("holding time")) {
    // This should only happen if we have a numeric value for holding time
    const hours = Math.floor(value / 60);
    const mins = Math.floor(value % 60);
    return `${hours}h ${mins}m`;
  } else if (metric.includes("Percentage")) {
    return `${value.toFixed(1)}%`;
  } else if (metric === "Net Profit" || metric === "Max DD") {
    return `$${value.toFixed(2)}`;
  } else {
    return value.toFixed(2);
  }
}
