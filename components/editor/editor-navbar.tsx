"use client"

import type { ReactNode } from "react"
import { UserButton } from "@clerk/nextjs"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
  centerContent?: ReactNode
}

export function EditorNavbar({
  isSidebarOpen,
  onSidebarToggle,
  centerContent,
}: EditorNavbarProps) {
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen
  const toggleLabel = isSidebarOpen
    ? "Close project sidebar"
    : "Open project sidebar"

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-4">
      <div className="flex w-24 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl text-copy-secondary hover:bg-accent-dim hover:text-copy-primary"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-pressed={isSidebarOpen}
          onClick={onSidebarToggle}
        >
          <ToggleIcon className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {centerContent}
      </div>

      <div className="flex w-24 items-center justify-end">
        <UserButton />
      </div>
    </header>
  )
}
