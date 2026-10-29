import type React from "react";
import DragWindowRegion from "@/components/drag-window-region";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <DragWindowRegion title="ER-AI Trainer Studio • Knowledge Ingestion Hub" />
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
    </div>
  );
}
