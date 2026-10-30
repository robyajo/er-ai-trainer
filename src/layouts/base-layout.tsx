import type React from "react";
import DragWindowRegion from "@/components/drag-window-region";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <DragWindowRegion title="ER-AI Trainer Studio • Knowledge Ingestion Hub" />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
