"use client";
import type { ReactElement } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import "./app-overlays.css";
export function AppTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} delay={300} closeDelay={100} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side="right"
          sideOffset={8}
          collisionPadding={12}
          className="trip-app-theme app-popover-positioner"
        >
          <Tooltip.Popup className="app-tooltip">{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
