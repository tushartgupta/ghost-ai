"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface EmptyProjectStateProps {
  title: string
}

function EmptyProjectState({ title }: EmptyProjectStateProps) {
  return (
    <div className="flex min-h-40 flex-1 items-center justify-center rounded-2xl border border-dashed border-subtle-border bg-surface/60 px-4 text-center">
      <p className="text-sm font-medium text-copy-muted">{title}</p>
    </div>
  )
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed bottom-4 left-4 top-16 z-40 flex w-[min(20rem,calc(100vw-2rem))] flex-col rounded-2xl border border-sidebar-border bg-sidebar shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out",
        isOpen
          ? "translate-x-0"
          : "pointer-events-none -translate-x-[calc(100%+2rem)]"
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl text-copy-muted hover:bg-accent-dim hover:text-copy-primary"
          aria-label="Close project sidebar"
          title="Close project sidebar"
          onClick={onClose}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <Tabs
        defaultValue="my-projects"
        className="flex min-h-0 flex-1 flex-col gap-4 p-4"
      >
        <TabsList className="grid h-9 w-full grid-cols-2 bg-subtle text-copy-muted">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="mt-0 flex min-h-0">
          <EmptyProjectState title="No projects yet" />
        </TabsContent>
        <TabsContent value="shared" className="mt-0 flex min-h-0">
          <EmptyProjectState title="No shared projects yet" />
        </TabsContent>
      </Tabs>

      <div className="border-t border-sidebar-border p-4">
        <Button type="button" className="w-full rounded-xl">
          <Plus className="size-4" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
