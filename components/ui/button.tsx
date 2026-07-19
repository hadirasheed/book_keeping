import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Mizan buttons are fully-rounded pills. Primary = action blue.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#0070e0] text-white hover:bg-[#005ecb] shadow-[0_1px_2px_rgba(0,28,100,.2)]",
        outline:
          "bg-white text-[#001c64] border-[1.5px] border-[#c3cbd3] hover:border-[#0070e0]",
        secondary:
          "bg-[#eef1f4] text-[#4a5056] hover:bg-[#e6e9ec]",
        ghost: "text-[#0070e0] hover:underline",
        destructive: "bg-[#c0392b] text-white hover:bg-[#a5321f]",
        link: "text-[#0070e0] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-[14.5px]",
        sm: "h-9 px-4 text-[13.5px]",
        lg: "h-12 px-7 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
