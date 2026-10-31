import { type ReactNode, useEffect, useState } from "react";
import { getPlatform } from "@/actions/app";
import { closeWindow, maximizeWindow, minimizeWindow } from "@/actions/window";
import { cn } from "cn";

export interface DragWindowRegionProps {
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function WindowButtons() {
  return (
    <div className="flex items-center text-muted-foreground">
      <button
        className="px-2.5 py-1.5 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        onClick={minimizeWindow}
        title="Minimize"
        type="button"
      >
        <svg
          aria-hidden="true"
          height="12"
          role="img"
          viewBox="0 0 12 12"
          width="12"
        >
          <rect fill="currentColor" height="1" width="10" x="1" y="6" />
        </svg>
      </button>
      <button
        className="px-2.5 py-1.5 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        onClick={maximizeWindow}
        title="Maximize"
        type="button"
      >
        <svg
          aria-hidden="true"
          height="12"
          role="img"
          viewBox="0 0 12 12"
          width="12"
        >
          <rect
            fill="none"
            height="9"
            stroke="currentColor"
            width="9"
            x="1.5"
            y="1.5"
          />
        </svg>
      </button>
      <button
        className="px-2.5 py-1.5 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
        onClick={closeWindow}
        title="Close"
        type="button"
      >
        <svg
          aria-hidden="true"
          height="12"
          role="img"
          viewBox="0 0 12 12"
          width="12"
        >
          <polygon
            fill="currentColor"
            fillRule="evenodd"
            points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
          />
        </svg>
      </button>
    </div>
  );
}

export default function DragWindowRegion({
  title,
  children,
  className,
}: DragWindowRegionProps) {
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getPlatform()
      .then((value) => {
        if (!active) {
          return;
        }
        setPlatform(value);
      })
      .catch((error) => {
        console.error("Failed to detect platform", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const isMacOS = platform === "darwin";

  return (
    <div
      className={cn(
        "flex h-11 w-full shrink-0 items-center justify-between border-b border-border bg-card/80 px-3 backdrop-blur-md text-xs select-none",
        className
      )}
    >
      <div className="draglayer flex flex-1 items-center h-full min-w-0 mr-3">
        {isMacOS && <div className="w-16 shrink-0" />}
        {title && (
          <div
            className="no-drag flex items-center gap-2 truncate pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {title}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {children}
        {!isMacOS && <WindowButtons />}
      </div>
    </div>
  );
}
