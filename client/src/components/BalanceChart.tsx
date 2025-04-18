import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ParsedReport } from "@shared/schema";
import Chart from "chart.js/auto";
import { Button } from "@/components/ui/button";
import { RefreshCw, ZoomIn } from "lucide-react";

// We need to import the zoom plugin
// Note: You may need to install this package with: npm install chartjs-plugin-zoom
import zoomPlugin from 'chartjs-plugin-zoom';
Chart.register(zoomPlugin);

interface BalanceChartProps {
  reports: ParsedReport[];
  tabId: string;
}

export default function BalanceChart({ reports, tabId }: BalanceChartProps) {
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    // Set up canvas reference
    canvasRef.current = document.getElementById(`balanceChart_${tabId}`) as HTMLCanvasElement;
    if (!canvasRef.current) return;

    // Create chart
    createBalanceChart();

    // Clean up
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [reports]);

  const createBalanceChart = () => {
    if (!canvasRef.current || reports.length === 0) return;

    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Generate datasets directly from deal numbers and balances
    const datasets = reports.map(report => {
      // Filter deals that have both Deal number and Balance
      const validDeals = (report.deals || [])
        .filter(deal => deal.Deal && deal.Balance)
        .slice(1); // Skip the first deal (consistent with original code)

      // Sort deals by deal number
      const sortedDeals = [...validDeals].sort((a, b) => {
        const dealA = parseInt(a.Deal.toString());
        const dealB = parseInt(b.Deal.toString());
        return dealA - dealB;
      });

      // Create data points with x: deal number, y: balance
      const dataPoints = sortedDeals.map(deal => ({
        x: parseInt(deal.Deal.toString()),
        y: typeof deal.Balance === "string"
          ? parseFloat(deal.Balance.replace(/\s/g, ""))
          : parseFloat(deal.Balance.toString())
      }));

      // Create dataset for the chart
      return {
        label: report.fileName.replace('.html', ''),
        data: dataPoints,
        borderColor: report.color,
        backgroundColor: "rgba(0,0,0,0)",
        borderWidth: 3,
        tension: 0.4,
        fill: false,
        pointBackgroundColor: report.color,
        pointBorderColor: 'rgba(255, 255, 255, 0.8)',
        pointBorderWidth: 1,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: report.color,
        pointHoverBorderColor: 'white'
      };
    });

    // Create chart
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: {
              display: false, // Hide the title
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.07)',
              lineWidth: 0.5
            },
            border: {
              display: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: {
                size: 11,
                family: 'var(--font-mono)'
              },
              padding: 5
            }
          },
          y: {
            title: {
              display: false, // Hide the title
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.07)',
              lineWidth: 0.5
            },
            border: {
              display: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: {
                size: 11,
                family: 'var(--font-mono)'
              },
              padding: 8,
              callback: function(value: any) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top' as const,
            align: 'center' as const,
            labels: {
              color: 'rgba(255, 255, 255, 0.95)',
              boxWidth: 18,
              usePointStyle: true,
              pointStyle: 'rect',
              font: {
                size: 12,
                family: 'var(--font-sans)',
                weight: 500
              },
              padding: 18
            }
          },
          datalabels: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(20, 20, 30, 0.9)',
            borderColor: 'hsla(var(--primary), 0.3)',
            borderWidth: 1,
            titleColor: 'rgba(255, 255, 255, 0.95)',
            bodyColor: 'rgba(255, 255, 255, 0.95)',
            titleFont: {
              family: 'var(--font-sans)',
              weight: 600,
              size: 13
            },
            bodyFont: {
              family: 'var(--font-mono)',
              size: 12
            },
            padding: 12,
            cornerRadius: 6,
            boxPadding: 6,
            callbacks: {
              title: function(tooltipItems: any[]) {
                if (tooltipItems.length > 0 && tooltipItems[0].parsed.x) {
                  return 'Deal #: ' + tooltipItems[0].parsed.x;
                }
                return '';
              },
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += '$' + context.parsed.y.toLocaleString('en-US', {
                    minimumFractionDigits: 0, // Round to whole numbers
                    maximumFractionDigits: 0
                  });
                }
                return label;
              }
            }
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x' as const,
            },
            zoom: {
              wheel: {
                enabled: false, // Disable mouse wheel zoom
              },
              pinch: {
                enabled: false, // Disable pinch zoom for consistency
              },
              mode: 'x' as const,
              drag: {
                enabled: true,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                threshold: 10
              },
            }
          }
        },
        elements: {
          point: {
            radius: 0, // Hide points by default
            hoverRadius: 6, // Show points on hover
            hitRadius: 8 // Larger hit area for better UX
          },
          line: {
            tension: 0.3,
            capBezierPoints: true
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    // Add event listener for zoom events
    // Only listen for mousedown events since we're only using drag zoom
    canvasRef.current.addEventListener('mousedown', () => {
      setIsZoomed(true);
    });
  };

  // Function to reset zoom
  const resetZoom = () => {
    if (chartRef.current) {
      // @ts-ignore - TypeScript doesn't know about the resetZoom method
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  };

  return (
    <Card className="p-5 border-none shadow-lg h-[580px] bg-card/80">
      <div className="flex justify-end mb-2 gap-2">
        {isZoomed && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetZoom}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw size={14} />
            Reset Zoom
          </Button>
        )}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ZoomIn size={14} />
          Drag to zoom in on a specific range
        </div>
      </div>
      <div className="w-full h-[calc(100%-40px)]">
        <canvas id={`balanceChart_${tabId}`} className="w-full h-full"></canvas>
      </div>
    </Card>
  );
}
