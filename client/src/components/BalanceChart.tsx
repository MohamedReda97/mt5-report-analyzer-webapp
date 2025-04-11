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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Deal Number',
              color: '#aaa'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#aaa'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Balance',
              color: '#aaa'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#aaa',
              callback: function(value: any) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#fff'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
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
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });
                }
                return label;
              }
            }
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
    <Card className="p-4 bg-muted h-[580px]">
      <div className="w-full h-full">
        <canvas id={`balanceChart_${tabId}`} className="w-full h-full"></canvas>
      </div>
    </Card>
  );
}
