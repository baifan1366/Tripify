"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { AppPopover } from "@/components/ui/app-popover";
import { WIDGET_ORDER, type PresetId } from "./widget-registry";
import { useWorkspaceGrid, type WidgetId } from "./workspace-layout-context";

const PRESET_IDS: PresetId[] = ["default", "planning", "explore", "decision"];

export function WorkspaceToolbar({
  titles,
  badges,
}: {
  titles: Record<WidgetId, string>;
  badges?: Partial<Record<WidgetId, number>>;
}) {
  const t = useTranslations("dock");
  const grid = useWorkspaceGrid();
  const hidden = WIDGET_ORDER.filter((id) => !grid.state.visible.includes(id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !(e.metaKey || e.ctrlKey) ||
        e.shiftKey ||
        e.key.toLowerCase() !== "z"
      )
        return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      grid.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grid]);

  return (
    <div className="ws-toolbar">
      <div className="ws-toolbar-group">
        <AppPopover
          className="ws-control dock-add-trigger"
          label={t("addPanel")}
          trigger={
            <>
              <Plus size={15} aria-hidden="true" />
              {t("addPanel")}
            </>
          }
        >
          {(close) => (
            <div className="dock-picker">
              {hidden.length === 0 && (
                <p className="decision-quiet">{t("allVisible")}</p>
              )}
              {hidden.map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => {
                    grid.show(id);
                    close();
                  }}
                >
                  {titles[id]}
                  {typeof badges?.[id] === "number" &&
                    (badges[id] ?? 0) > 0 && (
                      <span className="dock-badge">{badges[id]}</span>
                    )}
                </button>
              ))}
            </div>
          )}
        </AppPopover>
        <AppPopover
          className="ws-control"
          label={t("layoutPresets")}
          trigger={
            <>
              <LayoutGrid size={15} aria-hidden="true" />
              {t("layoutPresets")}
            </>
          }
        >
          {(close) => (
            <div className="dock-picker">
              <button
                type="button"
                aria-pressed={grid.state.preset === "default"}
                onClick={() => {
                  grid.applyPreset("default");
                  close();
                }}
              >
                {t("preset_default")}
              </button>
              <button
                type="button"
                aria-pressed={grid.state.preset === "planning"}
                onClick={() => {
                  grid.applyPreset("planning");
                  close();
                }}
              >
                {t("preset_planning")}
              </button>
              <button
                type="button"
                aria-pressed={grid.state.preset === "explore"}
                onClick={() => {
                  grid.applyPreset("explore");
                  close();
                }}
              >
                {t("preset_explore")}
              </button>
              <button
                type="button"
                aria-pressed={grid.state.preset === "decision"}
                onClick={() => {
                  grid.applyPreset("decision");
                  close();
                }}
              >
                {t("preset_decision")}
              </button>
            </div>
          )}
        </AppPopover>
        <button type="button" className="ws-control" onClick={grid.reset}>
          <RotateCcw size={15} aria-hidden="true" />
          <span>{t("resetLayout")}</span>
        </button>
        <button
          type="button"
          className="ws-control"
          disabled={!grid.canUndo}
          onClick={grid.undo}
        >
          <Undo2 size={15} aria-hidden="true" />
          <span>{t("undo")}</span>
        </button>
        <button
          type="button"
          className="ws-control"
          aria-pressed={grid.editing}
          onClick={() => grid.setEditing(!grid.editing)}
        >
          <Pencil size={15} aria-hidden="true" />
          <span>{grid.editing ? t("doneEditing") : t("editLayout")}</span>
        </button>
        <button
          type="button"
          className="ws-control"
          aria-label={t("printTrip")}
          title={t("printTrip")}
          onClick={() => window.print()}
        >
          <Printer size={15} aria-hidden="true" />
          <span>{t("printTrip")}</span>
        </button>
      </div>
      {hidden.length > 0 && (
        <div className="dock-minimized" aria-label={t("minimized")}>
          {hidden.map((id) => (
            <button
              type="button"
              className="ws-control ws-chip"
              key={id}
              onClick={() => grid.show(id)}
            >
              {titles[id]}
              <Plus size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {grid.unavailable && (
        <span className="dock-storage-note" role="status">
          {t("storageUnavailable")}
        </span>
      )}
      <span className="sr-only" role="status">
        {grid.announcement}
      </span>
    </div>
  );
}

export { PRESET_IDS };
