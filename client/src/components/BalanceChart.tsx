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
    
    // Generate balance data for each report based on deals
    const allTimePoints: string[] = [];
    
    // First pass: collect all time points from all reports
    reports.forEach(report => {
      const deals = report.deals || [];
      deals.forEach(deal => {
        if (deal.Time && !allTimePoints.includes(deal.Time)) {
          allTimePoints.push(deal.Time);
        }
      });
    });
    
    // Sort all time points chronologically
    allTimePoints.sort((a, b) => {
      const timeA = new Date(a).getTime();
      const timeB = new Date(b).getTime();
      return timeA - timeB;
    });
    
    // If we don't have any time points, create some placeholder ones
    if (allTimePoints.length < 2) {
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(now.getDate() - (10 - i));
        allTimePoints.push(date.toISOString().split('T')[0]);
      }
    }
    
    // Generate datasets with proper time correlation
    const datasets = reports.map(report => {
      const balanceMap: Record<string, number> = {};
      let balance = 10000; // Starting balance
      
      // Initialize with starting balance at first time point
      balanceMap[allTimePoints[0]] = balance;
      
      // Sort deals by time
      const sortedDeals = [...(report.deals || [])].sort((a, b) => {
        const timeA = new Date(a.Time).getTime();
        const timeB = new Date(b.Time).getTime();
        return timeA - timeB;
      });
      
      // Process each deal to update balance
      sortedDeals.forEach(deal => {
        if (deal.Time && deal.Profit) {
          balance += parseFloat(deal.Profit.toString());
          balanceMap[deal.Time] = balance;
        }
      });
      
      // Fill in balance values for all time points
      let lastBalance = 10000; // Default starting balance
      
      // Pre-process to ensure we have an initial value
      if (Object.keys(balanceMap).length === 0) {
        balanceMap[allTimePoints[0]] = lastBalance;
      }
      
      // Map through all timepoints and create a consistent dataset
      const data: number[] = allTimePoints.map(timePoint => {
        if (balanceMap[timePoint] !== undefined) {
          lastBalance = balanceMap[timePoint];
        }
        return lastBalance;
      });
      
      return {
        label: report.fileName.replace('.html', ''),
        data: data,
        borderColor: report.color,
        backgroundColor: `${report.color}33`, // Add transparency
        borderWidth: 2,
        tension: 0.3,
        fill: false
      };
    });
    
    // Format dates for display
    const labels = allTimePoints.map(timePoint => {
      try {
        const date = new Date(timePoint);
        return date.toLocaleDateString();
      } catch (e) {
        return timePoint;
      }
    });
    
    // Create chart
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time',
              color: '#aaa'
            },
            grid: {
              color: '#444'
            },
            ticks: {
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 15,
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
              color: '#444'
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
                if (tooltipItems.length > 0) {
                  return 'Date: ' + tooltipItems[0].label;
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
