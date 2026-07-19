import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Status pills use the Mizan status palette.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        default: "bg-[#e6f0fc] text-[#0070e0]",
        secondary: "bg-[#eef1f4] text-[#4a5056]",
        outline: "border border-[#e6e9ec] text-[#2c2e2f]",
        pending: "bg-[#fdf3dc] text-[#9a6a00]",
        processing: "bg-[#e6f0fc] text-[#0070e0]",
        done: "bg-[#e7f4ec] text-[#1a7f4b]",
        failed: "bg-[#fbeae8] text-[#c0392b]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
