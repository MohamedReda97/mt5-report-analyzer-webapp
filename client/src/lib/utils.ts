import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRandomColor() {
  const colors = [
    '#4285F4', '#EA4335', '#FBBC05', '#34A853', // Google colors
    '#FF5722', '#9C27B0', '#3F51B5', '#009688', // Material colors
    '#795548', '#607D8B', '#E91E63', '#00BCD4',
    '#FFC107', '#8BC34A', '#CDDC39', '#FF9800'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
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
