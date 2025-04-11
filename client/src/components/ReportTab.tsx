import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MetricsSection from "./MetricsSection";
import BalanceChart from "./BalanceChart";
import DealsTable from "./DealsTable";
import InputsTable from "./InputsTable";
import { ParsedReport } from "@shared/schema";

interface ReportTabProps {
  id: string;
  reports: ParsedReport[];
}

export default function ReportTab({ id, reports }: ReportTabProps) {
  const [legendState, setLegendState] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    reports.forEach(report => {
      initialState[report.fileName] = true;
    });
    return initialState;
  });
  
  const toggleLegendVisibility = (fileName: string) => {
    setLegendState(prev => ({
      ...prev,
      [fileName]: !prev[fileName]
    }));
  };
  
  const filteredReports = reports.filter(report => legendState[report.fileName]);
  
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        <Accordion type="multiple" defaultValue={["metrics", "balance", "deals", "inputs"]} className="w-full">
          {/* Metrics Summary Section */}
          <AccordionItem value="metrics">
            <AccordionTrigger className="text-xl text-primary">Metrics Summary</AccordionTrigger>
            <AccordionContent>
              <MetricsSection 
                reports={reports}
                legendState={legendState}
                onToggleLegend={toggleLegendVisibility}
                tabId={id}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Balance Chart Section */}
          <AccordionItem value="balance">
            <AccordionTrigger className="text-xl text-primary">Balance Chart</AccordionTrigger>
            <AccordionContent>
              <BalanceChart 
                reports={filteredReports}
                tabId={id}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Deals Table Section */}
          <AccordionItem value="deals">
            <AccordionTrigger className="text-xl text-primary">Deals Table</AccordionTrigger>
            <AccordionContent>
              <DealsTable 
                reports={reports}
                tabId={id}
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Inputs Comparison Section */}
          <AccordionItem value="inputs">
            <AccordionTrigger className="text-xl text-primary">Inputs Comparison</AccordionTrigger>
            <AccordionContent>
              <InputsTable 
                reports={reports}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}
