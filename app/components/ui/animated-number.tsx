"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  compact?: boolean; // when true, use compact currency formatter
  prefix?: string;
  suffix?: string;
  duration?: number; // seconds (ignored, NumberFlow handles this)
  isCents?: boolean; // when true, convert cents to dollars (divide by 100)
};

// Uses number-flow web component to animate numbers with trend 0
export function AnimatedNumber({
  value,
  className,
  compact = true,
  prefix = "",
  suffix = "",
  isCents = true,
}: AnimatedNumberProps) {
  const ref = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !ref.current) return;

    const el = ref.current;

    // Reset the element to ensure clean state
    el.trend = 0;
    el.locales = "en-US";

    // Configure number format
    if (compact) {
      el.format = {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: "compact",
      };
    } else {
      el.format = {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      };
    }

    if (prefix) {
      el.numberPrefix = prefix;
    }
    if (suffix) {
      el.numberSuffix = suffix;
    }

    setIsInitialized(true);
  }, [isClient, compact, prefix, suffix]);

  useEffect(() => {
    if (!isClient || !isInitialized || !ref.current) return;

    const el = ref.current;
    let numericValue = Math.max(0, Number.isFinite(value) ? value : 0);

    // Convert cents to dollars if isCents is true
    if (isCents) {
      numericValue = numericValue / 100;
    }

    // Update the number with animation
    if (typeof el.update === "function") {
      el.update(numericValue);
    }
  }, [value, isCents, isClient, isInitialized]);

  // Server-side or initial render: render placeholder
  if (!isClient) {
    return React.createElement("span", {
      className: cn("inline-block", className),
      suppressHydrationWarning: true,
    });
  }

  // Client-side: render number-flow element
  return React.createElement("number-flow", {
    ref,
    trend: 0,
    locales: "en-US",
    className: cn("inline-block", className),
    suppressHydrationWarning: true,
  } as any);
}
