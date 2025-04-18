import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import FileList from "@/components/FileList";
import ReportTab from "@/components/ReportTab";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRandomColor } from "@/lib/utils";
import { calculateMaxMetrics } from "@/lib/reportUtils";
import { ReportFile, ParsedReport } from "@shared/schema";

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<ReportFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<ReportFile[]>([]);
  const [tabs, setTabs] = useState<Record<string, { name: string, data: ParsedReport[] }>>({});
  const [activeTabId, setActiveTabId] = useState<string>("starterPage");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileUploadZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Set up drag and drop event listeners
  useEffect(() => {
    const fileUploadZone = fileUploadZoneRef.current;
    if (!fileUploadZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      fileUploadZone.classList.add("drag-over");
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      fileUploadZone.classList.remove("drag-over");
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      fileUploadZone.classList.remove("drag-over");

      if (e.dataTransfer?.files.length) {
        processFiles(e.dataTransfer.files);
      }
    };

    fileUploadZone.addEventListener("dragover", handleDragOver);
    fileUploadZone.addEventListener("dragleave", handleDragLeave);
    fileUploadZone.addEventListener("drop", handleDrop);

    return () => {
      fileUploadZone.removeEventListener("dragover", handleDragOver);
      fileUploadZone.removeEventListener("dragleave", handleDragLeave);
      fileUploadZone.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const htmlFiles = Array.from(fileList).filter(file => file.name.endsWith('.html'));

    if (htmlFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please select HTML report files only.",
        variant: "destructive",
      });
      return;
    }

    // Add to uploaded files
    const newFiles = htmlFiles.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      file,
    }));

    setUploadedFiles(prev => {
      const updatedFiles = [...prev];

      newFiles.forEach(newFile => {
        if (!updatedFiles.some(f => f.name === newFile.name)) {
          updatedFiles.push(newFile);
        }
      });

      return updatedFiles;
    });

    // Add to selected files
    setSelectedFiles(prev => {
      const updatedFiles = [...prev];

      newFiles.forEach(newFile => {
        if (!updatedFiles.some(f => f.name === newFile.name)) {
          updatedFiles.push(newFile);
        }
      });

      return updatedFiles;
    });
  };

  const toggleFileSelection = (file: ReportFile) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);

      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleGenerateReport = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one report file.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Create FormData with all selected files
      const formData = new FormData();
      selectedFiles.forEach(fileObj => {
        formData.append('reports', fileObj.file);
      });

      // Upload files and get parsed data
      const response = await fetch('/api/reports/parse', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`Failed to parse reports: ${response.status} ${response.statusText}`);
      }

      // Get the parsed report data
      const parsedData: ParsedReport[] = await response.json();

      // Check if any reports have errors
      const reportsWithErrors = parsedData.filter(report => report.metrics.error);
      if (reportsWithErrors.length > 0) {
        console.warn('Some reports had parsing errors:', reportsWithErrors);
        toast({
          title: "Warning",
          description: `${reportsWithErrors.length} report(s) had parsing issues but we'll continue with available data.`,
          variant: "warning",
        });
      }

      // Create tab name from selected files
      const tabName = selectedFiles.map(file => file.name.replace('.html', '')).join(' | ');
      const tabId = `tab_${new Date().getTime()}`; // Unique ID

      // Assign colors to each report
      parsedData.forEach(report => {
        report.color = getRandomColor();
      });

      // Calculate scores
      calculateMaxMetrics(parsedData);

      // Create new tab
      setTabs(prev => ({
        ...prev,
        [tabId]: {
          name: tabName,
          data: parsedData
        }
      }));

      // Set as active tab
      setActiveTabId(tabId);
    } catch (error) {
      console.error('Error parsing reports:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate the comparison report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = { ...prev };
      delete newTabs[tabId];
      return newTabs;
    });

    if (activeTabId === tabId) {
      setActiveTabId("starterPage");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Panel */}
      <div className="nav-container">
        <div className="nav-panel bg-secondary p-2 flex flex-row items-center justify-start gap-1 border-b border-border overflow-x-auto whitespace-nowrap">
          <button
            className={`tab ${activeTabId === "starterPage" ? "active" : ""}`}
            onClick={() => setActiveTabId("starterPage")}
          >
            Starter Page
          </button>

          {/* Dynamic Tabs */}
          {Object.entries(tabs).map(([id, tabData]) => (
            <button
              key={id}
              className={`tab ${activeTabId === id ? "active" : ""}`}
              onClick={() => setActiveTabId(id)}
            >
              {tabData.name}
              <span
                className="close-tab-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(id);
                }}
              >
                &times;
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content flex-1 p-5 overflow-y-auto">
        {/* Starter Page */}
        {activeTabId === "starterPage" && (
          <div className="space-y-5">
            {/* File Upload Section */}
            <Card className="p-5">
              <h2 className="text-xl text-primary mb-4 cursor-pointer">Upload Reports for Comparison</h2>

              {/* File Upload Zone */}
              <div
                ref={fileUploadZoneRef}
                className="file-upload-zone bg-accent p-10 rounded-lg border-2 border-dashed border-muted text-center cursor-pointer mb-4"
                onClick={handleFileUploadClick}
              >
                <div className="icon mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg mb-2">Drag & drop HTML report files here</p>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <Button>
                  Browse Files
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".html"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </Button>
              </div>

              {/* File List */}
              <FileList
                files={uploadedFiles}
                selectedFiles={selectedFiles}
                onToggleSelect={toggleFileSelection}
              />
            </Card>

            {/* Generate Button Section */}
            <Card className="p-5">
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || selectedFiles.length === 0}
                  className="px-6"
                >
                  {isGenerating ? "Generating..." : "Generate Comparison Report"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Report Tabs */}
        {Object.entries(tabs).map(([id, tabData]) => (
          <div
            key={id}
            className={`${activeTabId === id ? "block" : "hidden"}`}
          >
            <ReportTab
              id={id}
              reports={tabData.data}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
