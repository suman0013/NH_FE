import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterBadgeProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterBadge({ label, value, onRemove }: FilterBadgeProps) {
  return (
    <Badge variant="secondary" className="flex items-center space-x-1 glass">
      <span className="text-xs font-medium">{label}:</span>
      <span className="text-xs">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-3 w-3 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full ml-1"
      >
        <X className="h-2 w-2" />
      </Button>
    </Badge>
  );
}

interface ActiveFiltersProps {
  filters: Record<string, string>;
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  searchTerm?: string;
  onClearSearch?: () => void;
}

export function ActiveFilters({ 
  filters, 
  onRemoveFilter, 
  onClearAll, 
  searchTerm, 
  onClearSearch 
}: ActiveFiltersProps) {
  const activeFilters = Object.entries(filters).filter(([key, value]) => value && !(key === "country" && value === "India"));
  const hasActiveFilters = activeFilters.length > 0 || searchTerm;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-white/5 dark:bg-gray-900/20 backdrop-blur-sm rounded-lg border border-white/10">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Filters:</span>
      
      {searchTerm && onClearSearch && (
        <FilterBadge
          label="Search"
          value={searchTerm}
          onRemove={onClearSearch}
        />
      )}
      
      {activeFilters.map(([key, value]) => (
        <FilterBadge
          key={key}
          label={key.charAt(0).toUpperCase() + key.slice(1)}
          value={value}
          onRemove={() => onRemoveFilter(key)}
        />
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={onClearAll}
        className="h-6 text-xs glass border-0"
      >
        Clear All
      </Button>
    </div>
  );
}