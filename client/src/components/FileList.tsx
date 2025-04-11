import { ReportFile } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FileListProps {
  files: ReportFile[];
  selectedFiles: ReportFile[];
  onToggleSelect: (file: ReportFile) => void;
}

export default function FileList({ files, selectedFiles, onToggleSelect }: FileListProps) {
  if (files.length === 0) {
    return null;
  }
  
  return (
    <div className="flex gap-2 flex-wrap">
      {files.map(file => (
        <div
          key={file.id}
          className="bg-muted p-3 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onToggleSelect(file)}
        >
          <Checkbox 
            id={`file-${file.id}`}
            checked={selectedFiles.some(f => f.id === file.id)}
            onCheckedChange={() => onToggleSelect(file)}
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <label 
            htmlFor={`file-${file.id}`}
            className={cn(
              "cursor-pointer",
              selectedFiles.some(f => f.id === file.id) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {file.name.replace('.html', '')}
          </label>
        </div>
      ))}
    </div>
  );
}
