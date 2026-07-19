import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-[13px] font-bold leading-none text-[#2c2e2f]",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
