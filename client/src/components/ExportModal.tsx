import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSpreadsheet, FileText, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface District {
  name: string;
  state: string;
  country: string;
  namahattaCount: number;
  devoteeCount: number;
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

type ExportFormat = "csv" | "excel" | "pdf";

export function ExportModal({ open, onClose }: ExportModalProps) {
  const { toast } = useToast();
  const [selectedDistricts, setSelectedDistricts] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");
  const [includeNamahattas, setIncludeNamahattas] = useState(true);
  const [includeDevotees, setIncludeDevotees] = useState(true);

  const { data: districts = [], isLoading: districtsLoading } = useQuery<District[]>({
    queryKey: ["/api/reports/export/districts"],
    enabled: open,
    queryFn: async () => {
      const response = await fetch("/api/reports/export/districts", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch districts");
      }
      return response.json();
    }
  });

  useEffect(() => {
    if (!open) {
      setSelectedDistricts(new Set());
    }
  }, [open]);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const selectedDistrictsList = Array.from(selectedDistricts).map(key => {
        const parts = key.split("|||");
        return { district: parts[0], state: parts[1] };
      });

      const response = await apiRequest("POST", "/api/reports/export/data", {
        districts: selectedDistrictsList,
        includeNamahattas,
        includeDevotees
      });

      return response.json();
    },
    onSuccess: (data) => {
      generateExport(data, exportFormat);
      toast({
        title: "Export successful",
        description: `Your ${exportFormat.toUpperCase()} file has been downloaded.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    },
  });

  const toggleDistrict = (districtKey: string) => {
    const newSelected = new Set(selectedDistricts);
    if (newSelected.has(districtKey)) {
      newSelected.delete(districtKey);
    } else {
      newSelected.add(districtKey);
    }
    setSelectedDistricts(newSelected);
  };

  const selectAllDistricts = () => {
    const allKeys = districts.map(d => `${d.name}|||${d.state}`);
    setSelectedDistricts(new Set(allKeys));
  };

  const clearSelection = () => {
    setSelectedDistricts(new Set());
  };

  const generateExport = (data: any, format: ExportFormat) => {
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `namahatta-report-${timestamp}`;

    if (format === "csv" || format === "excel") {
      const workbook = XLSX.utils.book_new();

      if (data.districts && data.districts.length > 0) {
        const districtRows = data.districts.flatMap((d: any) => {
          if (d.subDistricts && d.subDistricts.length > 0) {
            return d.subDistricts.map((sd: any) => ({
              District: d.name,
              State: d.state,
              "Sub-District": sd.name,
              "Namahatta Count": sd.namahattaCount,
              "Devotee Count": sd.devoteeCount
            }));
          }
          return [{
            District: d.name,
            State: d.state,
            "Sub-District": "-",
            "Namahatta Count": d.namahattaCount,
            "Devotee Count": d.devoteeCount
          }];
        });
        const districtSheet = XLSX.utils.json_to_sheet(districtRows);
        XLSX.utils.book_append_sheet(workbook, districtSheet, "Districts");
      }

      if (includeNamahattas && data.namahattas && data.namahattas.length > 0) {
        const namahattaRows = data.namahattas.map((n: any) => ({
          Name: n.name,
          Code: n.code,
          District: n.district,
          State: n.state,
          "Sub-District": n.subDistrict,
          Village: n.village,
          "Meeting Day": n.meetingDay,
          "Meeting Time": n.meetingTime,
          Status: n.status,
          "Mala Senapoti": n.malaSenapoti,
          "Maha Chakra Senapoti": n.mahaChakraSenapoti,
          "Chakra Senapoti": n.chakraSenapoti,
          "Upa Chakra Senapoti": n.upaChakraSenapoti,
          President: n.president,
          Secretary: n.secretary,
          Accountant: n.accountant
        }));
        const namahattaSheet = XLSX.utils.json_to_sheet(namahattaRows);
        XLSX.utils.book_append_sheet(workbook, namahattaSheet, "Namahattas");
      }

      if (includeDevotees && data.devotees && data.devotees.length > 0) {
        const devoteeRows = data.devotees.map((d: any) => ({
          Name: d.name,
          Phone: d.phone,
          Email: d.email,
          District: d.district,
          State: d.state,
          "Sub-District": d.subDistrict,
          Village: d.village,
          Namahatta: d.namahatta,
          "Initiation Name": d.initiationName,
          "Leadership Role": d.leadershipRole,
          Status: d.status
        }));
        const devoteeSheet = XLSX.utils.json_to_sheet(devoteeRows);
        XLSX.utils.book_append_sheet(workbook, devoteeSheet, "Devotees");
      }

      if (format === "csv") {
        const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets["Districts"] || workbook.Sheets[workbook.SheetNames[0]]);
        downloadFile(csvContent, `${filename}.csv`, "text/csv");
      } else {
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      let yPosition = 20;

      doc.setFontSize(18);
      doc.text("Namahatta Preaching Report", 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
      yPosition += 10;

      if (data.districts && data.districts.length > 0) {
        doc.setFontSize(14);
        doc.text("District Summary", 14, yPosition);
        yPosition += 5;

        const districtTableData = data.districts.map((d: any) => [
          d.name,
          d.state,
          d.namahattaCount.toString(),
          d.devoteeCount.toString()
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["District", "State", "Namahattas", "Devotees"]],
          body: districtTableData,
          theme: "striped",
          headStyles: { fillColor: [102, 51, 153] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      if (includeNamahattas && data.namahattas && data.namahattas.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text("Namahattas", 14, yPosition);
        yPosition += 5;

        const namahattaTableData = data.namahattas.map((n: any) => [
          n.name,
          n.district,
          n.subDistrict,
          n.village,
          n.meetingDay,
          n.status
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Name", "District", "Sub-District", "Village", "Meeting Day", "Status"]],
          body: namahattaTableData,
          theme: "striped",
          headStyles: { fillColor: [102, 51, 153] },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      if (includeDevotees && data.devotees && data.devotees.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text("Devotees", 14, yPosition);
        yPosition += 5;

        const devoteeTableData = data.devotees.map((d: any) => [
          d.name,
          d.phone,
          d.district,
          d.namahatta,
          d.leadershipRole || "-"
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Name", "Phone", "District", "Namahatta", "Role"]],
          body: devoteeTableData,
          theme: "striped",
          headStyles: { fillColor: [102, 51, 153] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`${filename}.pdf`);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const groupedDistricts = districts.reduce((acc: Record<string, District[]>, district) => {
    const key = district.state;
    if (!acc[key]) acc[key] = [];
    acc[key].push(district);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Select districts and choose your export format
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Label className="text-sm font-medium">Export Format:</Label>
            <div className="flex gap-2">
              <Button
                variant={exportFormat === "excel" ? "default" : "outline"}
                size="sm"
                onClick={() => setExportFormat("excel")}
                data-testid="button-format-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button
                variant={exportFormat === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setExportFormat("csv")}
                data-testid="button-format-csv"
              >
                <FileText className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button
                variant={exportFormat === "pdf" ? "default" : "outline"}
                size="sm"
                onClick={() => setExportFormat("pdf")}
                data-testid="button-format-pdf"
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-namahattas"
                checked={includeNamahattas}
                onCheckedChange={(checked) => setIncludeNamahattas(checked === true)}
                data-testid="checkbox-include-namahattas"
              />
              <Label htmlFor="include-namahattas" className="text-sm">Include Namahattas</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-devotees"
                checked={includeDevotees}
                onCheckedChange={(checked) => setIncludeDevotees(checked === true)}
                data-testid="checkbox-include-devotees"
              />
              <Label htmlFor="include-devotees" className="text-sm">Include Devotees</Label>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                Select Districts ({selectedDistricts.size} selected)
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllDistricts} data-testid="button-select-all">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection} data-testid="button-clear-selection">
                  Clear
                </Button>
              </div>
            </div>

            {districtsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[250px] sm:h-[300px] border rounded-md p-2">
                {Object.entries(groupedDistricts).map(([state, stateDistricts]) => (
                  <div key={state} className="mb-3">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 px-1">
                      {state}
                    </div>
                    <div className="space-y-1">
                      {stateDistricts.map((district) => {
                        const districtKey = `${district.name}|||${district.state}`;
                        const isSelected = selectedDistricts.has(districtKey);
                        return (
                          <div
                            key={districtKey}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                            }`}
                            onClick={() => toggleDistrict(districtKey)}
                            data-testid={`district-option-${district.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleDistrict(districtKey)}
                              />
                              <span className="text-sm">{district.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {district.namahattaCount} centers
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {district.devoteeCount} devotees
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-export">
            Cancel
          </Button>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={selectedDistricts.size === 0 || exportMutation.isPending}
            data-testid="button-export"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
