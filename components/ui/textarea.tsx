import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-[10px] border border-[#d7dde3] bg-white px-3.5 py-2.5 text-sm text-[#2c2e2f] outline-none transition-colors placeholder:text-[#8b9198] focus-visible:border-[#0070e0] focus-visible:ring-2 focus-visible:ring-[#0070e0]/20 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
