import { useState } from "react";

type Toast = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = "default" }: Toast) => {
    const newToast = { title, description, variant };
    setToasts((prev) => [...prev, newToast]);

    // Show alert for now (simple implementation)
    const message = description ? `${title}\n${description}` : title;
    if (variant === "destructive") {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }

    // Remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== newToast));
    }, 3000);
  };

  return {
    toast,
    toasts,
  };
}
