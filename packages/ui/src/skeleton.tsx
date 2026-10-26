import * as React from "react";
import { cn } from "./utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-foreground/[0.06]", className)}
      {...props}
    />
  );
}

export { Skeleton };
