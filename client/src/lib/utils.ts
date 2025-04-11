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

export function sanitizeMetricValue(metric: string, value: any): number {
  if (metric.includes("holding time")) {
    // Convert time string to minutes for comparison
    const timeStr = value || "0:0:0";
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 60 + parts[1] + parts[2] / 60; // Hours to minutes + minutes + seconds/60
  } else {
    return parseFloat(value || 0);
  }
}

export function formatMetricValue(metric: string, value: number): string {
  if (metric.includes("holding time")) {
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
