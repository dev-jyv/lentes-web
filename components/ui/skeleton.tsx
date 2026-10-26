import { cn } from "cn"

// Carga con shimmer (1.4 s); con prefers-reduced-motion queda estático.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_25%,var(--accent)_50%,var(--muted)_75%)] bg-[length:250%_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
