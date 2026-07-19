import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight native <select> styled to match Mizan inputs.
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full appearance-none rounded-[10px] border border-[#d7dde3] bg-white px-3.5 py-2 pr-9 text-sm text-[#2c2e2f] outline-none transition-colors focus-visible:border-[#0070e0] focus-visible:ring-2 focus-visible:ring-[#0070e0]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8b9198]" />
  </div>
));
Select.displayName = "Select";

export { Select };
