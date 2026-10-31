import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Activity } from "react";
import { inDevelopment } from "@/constants";
import BaseLayout from "@/layouts/base-layout";
import { Toaster } from "@/components/ui/sonner";

function Root() {
  return (
    <BaseLayout>
      <Outlet />
      <Toaster position="bottom-right" richColors />
      {/*<Activity mode={inDevelopment ? "visible" : "hidden"}>
        <TanStackRouterDevtools />
      </Activity>*/}
    </BaseLayout>
  );
}

export const Route = createRootRoute({
  component: Root,
});
