"use client";

import { ContentBox } from "@madecki/ui";
import { useEffect } from "react";

interface SuccessToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function SuccessToast({ message, onDismiss, duration = 3000 }: SuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <ContentBox variant="success">
        <span className="text-sm font-medium">{message}</span>
      </ContentBox>
    </div>
  );
}
