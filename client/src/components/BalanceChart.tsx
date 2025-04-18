import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ParsedReport } from "@shared/schema";
import Chart from "chart.js/auto";

interface BalanceChartProps {
  reports: ParsedReport[];
  tabId: string;
}

export default function BalanceChart({ reports, tabId }: BalanceChartProps) {
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        borderWidth: 2,
        tension: 0.4,
        fill: false
      };
    });

    // Create chart
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        datasets: datasets
      },
      animation: false,
      plugins: [
      //   {
      //   id: 'hideLabels',
      //   beforeRender: (chart: any) => {
      //     chart.data.datasets.forEach((dataset: any) => {
      //       dataset.pointLabels = { display: false };
      //     });
      //   }
      // }
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: {
              display: false,
              text: 'Deal Number',
              color: 'rgba(255, 255, 255, 0.7)'
            },
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
                size: 10,
                family: 'monospace'
              }
            }
          },
          y: {
            title: {
              display: false,
              text: 'Balance',
              color: 'rgba(255, 255, 255, 0.7)'
            },
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
                size: 10,
                family: 'monospace'
              },
              callback: function(value: any) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              boxWidth: 15,
              font: {
                size: 12
              },
              padding: 15
            }
          },
          datalabels: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleColor: 'rgba(255, 255, 255, 0.9)',
            bodyColor: 'rgba(255, 255, 255, 0.9)',
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
          }
        },
        elements: {
          point: {
            radius: 4, // Remove point markers in line
            hoverRadius: 4 // Show points only on hover
          },
          line: {
            tension: 0.3
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  };

  return (
    <Card className="p-4 border-none shadow-lg h-[580px]">
      <div className="w-full h-full">
        <canvas id={`balanceChart_${tabId}`} className="w-full h-full"></canvas>
      </div>
    </Card>
  );
}