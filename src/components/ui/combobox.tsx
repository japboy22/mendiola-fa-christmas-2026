"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  shortPlaceholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  hideSearch?: boolean;
  hideAllOption?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  shortPlaceholder,
  searchPlaceholder = "Search...",
  emptyText = "No matching results.",
  className,
  disabled,
  hideSearch = false,
  hideAllOption = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [value, options]
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          className={cn(
            "flex h-11 w-full items-center justify-between whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 shadow-2xs transition-all duration-200 ease-out hover:border-primary/60 hover:bg-red-50/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            !selectedOption && "text-zinc-500 font-normal",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate sm:gap-2">
            {selectedOption ? (
              <span className="truncate" title={selectedOption.label}>
                {selectedOption.label}
              </span>
            ) : shortPlaceholder ? (
              <>
                <span className="truncate sm:hidden" title={placeholder}>
                  {shortPlaceholder}
                </span>
                <span className="hidden truncate sm:inline" title={placeholder}>
                  {placeholder}
                </span>
              </>
            ) : (
              <span className="truncate" title={placeholder}>
                {placeholder}
              </span>
            )}
            {selectedOption?.badge && (
              <span className="hidden shrink-0 rounded-md bg-primary/10 border border-primary/25 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary sm:inline-block">
                {selectedOption.badge}
              </span>
            )}
          </span>
          <ChevronsUpDown
            className={cn(
              "ml-1 h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ease-out sm:ml-2",
              open && "scale-110 text-primary"
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="mfc-popover-content z-60 w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-[min(calc(100vw-2rem),520px)] overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-xl p-0"
        >
          <CommandPrimitive className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-white text-zinc-950">
            {!hideSearch && (
              <div
                className="flex items-center border-b border-zinc-200 px-3"
                cmdk-input-wrapper=""
              >
                <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
                <CommandPrimitive.Input
                  placeholder={searchPlaceholder}
                  className="flex h-11 w-full bg-transparent py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
            <CommandPrimitive.List
              id={listboxId}
              className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1.5"
            >
              <CommandPrimitive.Empty className="py-6 text-center text-sm text-zinc-500">
                {emptyText}
              </CommandPrimitive.Empty>
              <CommandPrimitive.Group className="overflow-hidden text-zinc-900">
                {!hideAllOption && (
                  <CommandPrimitive.Item
                    value="_all"
                    onSelect={() => {
                      onChange?.(null);
                      setOpen(false);
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none transition-colors duration-150 aria-selected:bg-red-50 aria-selected:text-zinc-950"
                  >
                    <Check
                      className={cn(
                        "mr-2.5 h-4 w-4 shrink-0 text-primary transition-opacity duration-150",
                        !value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate font-medium">
                      {placeholder}
                    </span>
                  </CommandPrimitive.Item>
                )}
                {options.map((option) => (
                  <CommandPrimitive.Item
                    key={option.value}
                    value={`${option.label} ${option.sublabel ?? ""} ${option.badge ?? ""} ${option.value}`}
                    onSelect={() => {
                      onChange?.(option.value);
                      setOpen(false);
                    }}
                    className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors duration-150 aria-selected:bg-red-50 aria-selected:text-zinc-950"
                  >
                    <div className="flex min-w-0 items-center">
                      <Check
                        className={cn(
                          "mr-2.5 h-4 w-4 shrink-0 text-primary transition-opacity duration-150",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-900">
                          {option.label}
                        </div>
                        {option.sublabel && (
                          <div className="truncate text-xs text-zinc-500">
                            {option.sublabel}
                          </div>
                        )}
                      </div>
                    </div>
                    {option.badge && (
                      <span className="shrink-0 rounded-md bg-red-50 border border-red-200 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        {option.badge}
                      </span>
                    )}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            </CommandPrimitive.List>
          </CommandPrimitive>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
