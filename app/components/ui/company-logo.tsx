import { cn } from "~/lib/utils";

interface CompanyLogoProps {
  src?: string;
  alt: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
  full: "h-full w-full",
};

export function CompanyLogo({
  src,
  alt,
  className,
  size = "md",
}: CompanyLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-muted overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-semibold text-primary truncate px-1">
          {alt.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
