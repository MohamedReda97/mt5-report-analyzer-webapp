import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Keep track of used colors to ensure no duplicates
const usedColors = new Set<string>();
// Keep track of last used color to avoid similar colors
let lastUsedColor: string | null = null;

export function getRandomColor() {
  // Distinct, high-contrast colors that are not too light
  // Avoiding yellows and light colors for better visibility
  const colors = [
    '#e63946', // Bright red
    '#3a86ff', // Bright blue
    '#2a9d8f', // Teal
    '#8338ec', // Purple
    '#fb5607', // Orange
    '#ff006e', // Hot pink
    '#1e88e5', // Material blue
    '#43a047', // Material green
    '#5e35b1', // Deep purple
    '#d81b60', // Material pink
    '#0097a7', // Cyan
    '#c62828', // Dark red
    '#6a1b9a', // Dark purple
    '#00695c', // Dark teal
    '#283593', // Indigo
    '#558b2f'  // Olive green
  ];

  // If all colors used, reset
  if (usedColors.size >= colors.length) {
    usedColors.clear();
    lastUsedColor = null;
  }

  // Find an unused color that's not too similar to the last one
  let color: string;
  do {
    color = colors[Math.floor(Math.random() * colors.length)];
    // If we have a last color, make sure the new one is different enough
    if (lastUsedColor && areSimilarColors(color, lastUsedColor)) {
      continue;
    }
  } while (usedColors.has(color));

  // Mark as used and update last used color
  usedColors.add(color);
  lastUsedColor = color;
  return color;
}

// Helper function to check if two colors are too similar
function areSimilarColors(color1: string, color2: string): boolean {
  // Simple check - if the first 3 characters after # are the same, colors might be similar
  return color1.substring(1, 4) === color2.substring(1, 4);
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
