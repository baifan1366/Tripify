"use client";
import { useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import "./app-overlays.css";

/** Non-modal disclosure with native link/tab navigation, not an ARIA menu. */
export function AppPopover({
  trigger,
  label,
  className,
  children,
  side = "bottom",
}: {
  trigger: ReactNode;
  label: string;
  className?: string;
  side?: "bottom" | "right";
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("mvp");
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={className} aria-label={label}>
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side={side}
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="trip-app-theme app-popover-positioner"
        >
          <Popover.Popup className="app-popover">
            <div className="app-popover-heading">
              <Popover.Title>{label}</Popover.Title>
              <Popover.Close aria-label={t("close")}>
                <X size={16} aria-hidden="true" />
              </Popover.Close>
            </div>
            {typeof children === "function"
              ? children(() => setOpen(false))
              : children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
