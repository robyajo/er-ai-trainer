import type React from "react";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-teal-500/20 selection:text-teal-400">
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
