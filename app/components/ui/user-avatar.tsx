import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { cn } from "~/lib/utils";

interface UserAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

export function UserAvatar({
  src,
  alt,
  fallback,
  className,
  size = "sm",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [src]);

  // Extract initials from alt text if fallback not provided
  const fallbackText =
    fallback ||
    alt
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Only show image if src is valid and no error occurred
  const shouldShowImage = src && !imageError;

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    console.warn(`Failed to load image for user: ${alt} (${src})`);
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {shouldShowImage && (
        <AvatarImage
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
}
