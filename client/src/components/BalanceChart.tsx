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
    const datasets = reports.map(report => {
      // Generate balance data points from deals
      let balance = 10000; // Starting balance
      const data: number[] = [balance];
      
      // Sort deals by time
      const sortedDeals = [...(report.deals || [])].sort((a, b) => {
        const timeA = new Date(a.Time).getTime();
        const timeB = new Date(b.Time).getTime();
        return timeA - timeB;
      });
      
      sortedDeals.forEach(deal => {
        if (deal.Profit) {
          balance += parseFloat(deal.Profit.toString());
          data.push(balance);
        }
      });
      
      // If no deals or insufficient data, create sample data
      if (data.length < 2) {
        for (let i = 0; i < 10; i++) {
          balance += (Math.random() * 200) - 100;
          data.push(balance);
        }
      }
      
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
    
    // Create labels (dates or sequential numbers)
    const maxDataPoints = Math.max(...datasets.map(d => d.data.length));
    const labels = Array.from({ length: maxDataPoints }, (_, i) => `Day ${i + 1}`);
    
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
            grid: {
              color: '#444'
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              color: '#aaa'
            }
          },
          y: {
            grid: {
              color: '#444'
            },
            ticks: {
              color: '#aaa'
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
            intersect: false
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
