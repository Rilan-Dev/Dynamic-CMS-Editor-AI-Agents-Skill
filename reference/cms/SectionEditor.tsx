"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

/**
 * Collapsible section wrapper for top-level document keys
 * (port of EquiTenant SectionEditor).
 */
export function SectionEditor({
  title,
  isEditing,
  onAdd,
  onDelete,
  actions,
  children,
  defaultOpen = false,
}: {
  title: string;
  isEditing: boolean;
  onAdd?: () => void;
  onDelete?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 pl-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 p-1 px-2">
            <span className="text-sm font-semibold">{title}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          {actions}
          {onAdd && (
            <Button size="sm" variant="outline" onClick={onAdd}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="text-muted-foreground hover:text-red-600"
              aria-label={`Delete ${title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
