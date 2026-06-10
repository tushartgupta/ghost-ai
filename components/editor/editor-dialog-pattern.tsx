"use client"

import type { ReactNode } from "react"

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface EditorDialogContentProps
  extends React.ComponentProps<typeof DialogContent> {
  title: string
  description?: string
  footerActions?: ReactNode
}

export function EditorDialogContent({
  title,
  description,
  footerActions,
  children,
  className,
  ...props
}: EditorDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        "rounded-3xl border border-surface-border bg-elevated p-6 text-copy-primary shadow-2xl",
        className
      )}
      {...props}
    >
      <DialogHeader className="gap-2">
        <DialogTitle className="text-copy-primary">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-copy-muted">
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>

      {children}

      {footerActions ? (
        <DialogFooter className="gap-2 pt-2">{footerActions}</DialogFooter>
      ) : null}
    </DialogContent>
  )
}
