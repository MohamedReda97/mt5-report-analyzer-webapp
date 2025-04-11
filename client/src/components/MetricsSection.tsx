import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { formatMetricName, sanitizeMetricValue, formatMetricValue } from "@/lib/utils";
import { ParsedReport } from "@shared/schema";
import Chart from "chart.js/auto";
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface MetricsSectionProps {
  reports: ParsedReport[];
  legendState: Record<string, boolean>;
  onToggleLegend: (fileName: string) => void;
  tabId: string;
}

export default function MetricsSection({ reports, legendState, onToggleLegend, tabId }: MetricsSectionProps) {
  const chartsRef = useRef<Record<string, Chart>>({});
  
  // Register the datalabels plugin
  Chart.register(ChartDataLabels);
  
  useEffect(() => {
    // Clean up charts when component unmounts
    return () => {
      Object.values(chartsRef.current).forEach(chart => chart.destroy());
    };
  }, []);
  
  useEffect(() => {
    // Create or update charts when legendState changes
    createMetricsCharts();
  }, [legendState]);
  
  const createMetricsCharts = () => {
    const metricsToDisplay = [
      "Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", 
      "Sharpe Ratio", "Trades", "Win Rate", "Z-Score", "AvgP", "AvgL", 
      "Short Trades (won %) Count", "Short Trades (won %) Percentage", 
      "Long Trades (won %) Count", "Long Trades (won %) Percentage", 
      "Maximal position holding time", "Average position holding time", "Score"
    ];
    
    metricsToDisplay.forEach(metric => {
      const canvasId = `${metric.replace(/\s+/g, '_')}_${tabId}`;
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      
      if (!canvas) return;
      
      // Destroy existing chart if it exists
      if (chartsRef.current[canvasId]) {
        chartsRef.current[canvasId].destroy();
      }
      
      // Filter reports based on legend state
      const filteredReports = reports.filter(report => legendState[report.fileName]);
      
      if (filteredReports.length === 0) return;
      
      // Prepare data for chart
      const labels = filteredReports.map(report => report.fileName.replace('.html', ''));
      const values = filteredReports.map(report => {
        const rawValue = report.metrics[metric];
        return sanitizeMetricValue(metric, rawValue);
      });
      const colors = filteredReports.map(report => report.color);
      
      // Process values for time-based metrics
      const processedValues = values.map((value, index) => {
        // For time-based metrics, convert HH:MM:SS to hours
        if (typeof value === 'string' && value.includes(':') && 
           (metric.includes("Maximal position holding time") || 
            metric.includes("Average position holding time"))) {
          const parts = value.split(':');
          const hours = parseInt(parts[0] || '0');
          const minutes = parseInt(parts[1] || '0');
          const seconds = parseInt(parts[2] || '0');
          return hours + minutes / 60 + seconds / 3600;
        }
        return value;
      });

      // Process values to ensure they're all numbers
      const numericValues = processedValues.map(v => typeof v === 'string' ? 0 : v);
      
      // Determine min and max values for x-axis scaling based on the metric
      const maxValue = Math.max(...numericValues, 0.1);
      const minValue = Math.min(...numericValues, 0) < 0 ? Math.min(...numericValues) : 0;

      // Calculate reasonable tick values based on the data range
      const range = maxValue - minValue;
      let tickStep = range / 5;
      
      // Round the tickStep to a sensible value (handle zero or very small values)
      const magnitude = tickStep > 0 
        ? Math.pow(10, Math.floor(Math.log10(tickStep))) 
        : 0.1;
      
      tickStep = tickStep > 0 
        ? Math.ceil(tickStep / magnitude) * magnitude 
        : 0.5;
      
      // Generate ticks
      const ticks = [];
      let currentTick = minValue;
      while (currentTick <= maxValue) {
        ticks.push(currentTick);
        currentTick += tickStep;
      }
      
      // Create new chart with horizontal bar format
      const newChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: processedValues.map(val => typeof val === 'string' ? 0 : val),
            backgroundColor: colors,
            borderWidth: 0,
            barPercentage: 0.75, /* Wider bars */
            categoryPercentage: 0.9, /* More space taken by bars */
            borderRadius: 2
          }]
        },
        options: {
          indexAxis: 'y', // Horizontal bar chart
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              left: 0,
              right: 10,
              top: 5,
              bottom: 10
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.05)',
                lineWidth: 0.5
              },
              border: {
                display: false
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
                font: {
                  size: 9,
                  family: 'monospace'
                },
                // Type any is used to bypass the specific Chart.js typing issues
                callback: function(this: any, tickValue: any, index: any, ticks: any) {
                  // Ensure we have a number
                  const value = Number(tickValue);
                  
                  // Format the tick values for better readability
                  if (!isNaN(value) && Math.abs(value) >= 1000) {
                    return (value / 1000).toLocaleString() + 'k';
                  }
                  return tickValue.toString();
                },
                maxRotation: 0
              },
              min: minValue,
              max: maxValue + (maxValue - minValue) * 0.1 // Add some padding
            },
            y: {
              display: false // Hide y-axis as we're using the title for this
            }
          },
          plugins: {
            legend: {
              display: false
            },
            // Disable datalabels for cleaner appearance matching the reference image
            datalabels: {
              display: true,
              align: 'end',
              anchor: 'end',
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                size: 12,
                weight: 'bold'
              },
              formatter: function(value: any) {
                // Round numbers to 1 decimal place and ensure no very long decimals
                if (typeof value === 'number') {
                  // Show integers without decimal places
                  if (Number.isInteger(value)) {
                    return value.toString();
                  }
                  // Round to 1 decimal place for non-integers
                  return value.toFixed(1);
                }
                return value;
              }
            },
            tooltip: {
              callbacks: {
                title: function(tooltipItems) {
                  // Display file name as title
                  return labels[tooltipItems[0].dataIndex];
                },
                label: function(context) {
                  // For time-based metrics display the original format
                  if (metric.includes("Maximal position holding time") || 
                      metric.includes("Average position holding time")) {
                    const originalValue = filteredReports[context.dataIndex].metrics[metric];
                    if (typeof originalValue === 'string') {
                      return formatMetricName(metric) + ': ' + originalValue;
                    }
                  }
                  
                  const value = context.parsed.x;
                  return formatMetricName(metric) + ': ' + formatMetricValue(metric, value);
                }
              }
            }
          }
        }
      });
      
      // Store reference to the chart
      chartsRef.current[canvasId] = newChart;
    });
  };
  
  return (
    <Card className="p-4 border-none shadow-lg">
      {/* Legend Section */}
      <div className="flex justify-center mb-4 flex-wrap">
        {reports.map(report => (
          <div
            key={report.fileName}
            className="legend-item"
            onClick={() => onToggleLegend(report.fileName)}
            data-source={report.fileName}
            style={{ opacity: legendState[report.fileName] ? 1 : 0.5 }}
          >
            <div
              className="legend-color"
              style={{ backgroundColor: report.color }}
            ></div>
            <span>{report.fileName.replace('.html', '')}</span>
          </div>
        ))}
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1 justify-items-center p-2 rounded-lg">
        {[
          "Net Profit", "Max DD", "Profit Factor", "EPO", 
          "Recovery Factor", "Sharpe Ratio", "Trades", "Win Rate", 
          "Z-Score", "AvgP", "AvgL", "Short Trades (won %) Count", 
          "Short Trades (won %) Percentage", "Long Trades (won %) Count", 
          "Long Trades (won %) Percentage", "Maximal position holding time", 
          "Average position holding time", "Score"
        ].map(metric => (
          <div key={metric} className="metric-card">
            <h3>{formatMetricName(metric)}</h3>
            <canvas id={`${metric.replace(/\s+/g, '_')}_${tabId}`} width="150" height="120"></canvas>
          </div>
        ))}
      </div>
    </Card>
  );
}
