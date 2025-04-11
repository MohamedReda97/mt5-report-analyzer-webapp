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

      // Create new chart with bar format
      const newChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels.map(() => ''), // Empty labels for cleaner presentation
          datasets: [{
            data: processedValues,
            backgroundColor: colors,
            borderWidth: 1,
            borderColor: colors.map(color => color + '80'), // Add transparency
            barPercentage: 0.8,
            categoryPercentage: 0.9
          }]
        },
        options: {
          indexAxis: 'y', // Horizontal bar chart
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: {
                display: false
              },
              display: false // Hide x-axis
            },
            y: {
              grid: {
                display: false
              },
              display: false // Hide y-axis
            }
          },
          plugins: {
            legend: {
              display: false
            },
            datalabels: {
              display: 'auto',
              color: "#fff",
              formatter: (value: any, context: any) => {
                // For time-based metrics, convert back to HH:MM:SS
                if (typeof value === 'number' && 
                   (metric.includes("Maximal position holding time") || 
                    metric.includes("Average position holding time"))) {
                  const hours = Math.floor(value);
                  const minutes = Math.floor((value - hours) * 60);
                  const seconds = Math.floor(((value - hours) * 60 - minutes) * 60);
                  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
                return formatMetricValue(metric, value);
              },
              font: { weight: "bold", size: 12 },
              anchor: 'end',
              align: 'right',
              offset: 5,
              textAlign: 'right'
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
                  
                  const value = context.raw as number;
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
    <Card className="p-4 bg-muted">
      {/* Legend Section */}
      <div className="flex justify-center mb-5 flex-wrap">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 justify-items-center">
        {[
          "Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", 
          "Sharpe Ratio", "Trades", "Win Rate", "Z-Score", "AvgP", "AvgL", 
          "Short Trades (won %) Count", "Short Trades (won %) Percentage", 
          "Long Trades (won %) Count", "Long Trades (won %) Percentage", 
          "Maximal position holding time", "Average position holding time", "Score"
        ].map(metric => (
          <div key={metric} className="metric-card bg-secondary p-2 rounded-lg text-center w-[172px]">
            <h3 className="text-sm font-semibold mb-1">{formatMetricName(metric)}</h3>
            <canvas id={`${metric.replace(/\s+/g, '_')}_${tabId}`} width="150" height="150"></canvas>
          </div>
        ))}
      </div>
    </Card>
  );
}
