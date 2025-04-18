import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { formatMetricName, sanitizeMetricValue, formatMetricValue } from "@/lib/utils";
import { ParsedReport } from "@shared/schema";
import Chart from "chart.js/auto";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  TrendingUp,
  TrendingDown,
  BarChart4,
  PieChart,
  Clock,
  Target,
  Percent,
  DollarSign,
  Scale,
  Activity,
  Award,
  BarChart,
  Timer,
  ArrowUp,
  ArrowDown,
  Zap
} from "lucide-react";

interface MetricsSectionProps {
  reports: ParsedReport[];
  legendState: Record<string, boolean>;
  onToggleLegend: (fileName: string) => void;
  tabId: string;
}

// Helper function to get the appropriate icon for each metric
const getMetricIcon = (metric: string) => {
  switch (metric) {
    case "Net Profit":
      return <DollarSign className="h-5 w-5 text-primary" />;
    case "Max DD":
      return <TrendingDown className="h-5 w-5 text-destructive" />;
    case "Profit Factor":
      return <Scale className="h-5 w-5 text-primary" />;
    case "EPO":
      return <Target className="h-5 w-5 text-primary" />;
    case "Recovery Factor":
      return <TrendingUp className="h-5 w-5 text-primary" />;
    case "Sharpe Ratio":
      return <Activity className="h-5 w-5 text-primary" />;
    case "Trades":
      return <BarChart4 className="h-5 w-5 text-primary" />;
    case "Win Rate":
      return <Award className="h-5 w-5 text-primary" />;
    case "Z-Score":
      return <Zap className="h-5 w-5 text-primary" />;
    case "AvgP":
      return <ArrowUp className="h-5 w-5 text-primary" />;
    case "AvgL":
      return <ArrowDown className="h-5 w-5 text-destructive" />;
    case "Short Trades (won %) Count":
      return <BarChart className="h-5 w-5 text-primary" />;
    case "Short Trades (won %) Percentage":
      return <Percent className="h-5 w-5 text-primary" />;
    case "Long Trades (won %) Count":
      return <BarChart className="h-5 w-5 text-primary" />;
    case "Long Trades (won %) Percentage":
      return <Percent className="h-5 w-5 text-primary" />;
    case "Maximal position holding time":
      return <Clock className="h-5 w-5 text-primary" />;
    case "Average position holding time":
      return <Timer className="h-5 w-5 text-primary" />;
    case "Score":
      return <PieChart className="h-5 w-5 text-primary" />;
    default:
      return <Activity className="h-5 w-5 text-primary" />;
  }
};

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
      const processedValues = values.map((value) => {
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
            data: processedValues.map(val => typeof val === 'number' ? Math.round(val * 10) / 10 : 0), //Rounding to one decimal
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
                display: false // Hide x-axis ticks/labels
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
            datalabels: {
              display: true,
              align: 'center',
              anchor: 'center',
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                size: 14,
                weight: 'bold'
              },
              formatter: function(value: any) {
                if (typeof value === 'number') {
                  return Math.abs(value) < 0.01 ? value.toExponential(2) : value.toFixed(2);
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
    <Card className="p-5 border-none shadow-lg bg-card/80">
      {/* Legend Section */}
      <div className="flex justify-center mb-4 flex-wrap">
        {reports.map(report => (
          <div
            key={report.fileName}
            className="legend-item"
            onClick={() => onToggleLegend(report.fileName)}
            data-source={report.fileName}
            style={{
              opacity: legendState[report.fileName] ? 1 : 0.5,
              borderColor: legendState[report.fileName] ? `hsla(var(--primary), 0.3)` : 'transparent'
            }}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 justify-items-center p-2 rounded-lg">
        {[
          "Net Profit", "Max DD", "Profit Factor", "EPO",
          "Recovery Factor", "Sharpe Ratio", "Trades", "Win Rate",
          "Z-Score", "AvgP", "AvgL", "Short Trades (won %) Count",
          "Short Trades (won %) Percentage", "Long Trades (won %) Count",
          "Long Trades (won %) Percentage", "Maximal position holding time",
          "Average position holding time", "Score"
        ].map(metric => (
          <div key={metric} className="metric-card text-center hover:scale-105 transition-transform duration-200">
            <h3 className="text-center">
              {getMetricIcon(metric)}
              <span>{formatMetricName(metric)}</span>
            </h3>
            <canvas id={`${metric.replace(/\s+/g, '_')}_${tabId}`} width="150" height="120"></canvas>
          </div>
        ))}
      </div>
    </Card>
  );
}