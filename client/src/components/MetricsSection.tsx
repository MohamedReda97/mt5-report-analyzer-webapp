import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { formatMetricName, sanitizeMetricValue, formatMetricValue } from "@/lib/utils";
import { ParsedReport } from "@shared/schema";
import Chart from "chart.js/auto";

interface MetricsSectionProps {
  reports: ParsedReport[];
  legendState: Record<string, boolean>;
  onToggleLegend: (fileName: string) => void;
  tabId: string;
}

export default function MetricsSection({ reports, legendState, onToggleLegend, tabId }: MetricsSectionProps) {
  const chartsRef = useRef<Record<string, Chart>>({});
  
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
      
      // Create new chart
      const newChart = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw as number;
                  return `${label}: ${formatMetricValue(metric, value)}`;
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
            <canvas id={`${metric.replace(/\s+/g, '_')}_${tabId}`} width="180" height="180"></canvas>
          </div>
        ))}
      </div>
    </Card>
  );
}
