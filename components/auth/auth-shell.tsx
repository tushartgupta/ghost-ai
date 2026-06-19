import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

interface AuthShellProps {
  children: ReactNode
  features: AuthFeature[]
  heading: string
  intro: string
  tagline: string
}

interface AuthFeature {
  description: string
  icon: LucideIcon
  title: string
}

export function AuthShell({
  children,
  features,
  heading,
  intro,
  tagline,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-base font-sans text-copy-primary lg:grid-cols-2">
      <section className="hidden min-h-screen border-r border-surface-border bg-surface px-16 py-12 lg:flex lg:flex-col xl:px-20">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl bg-brand"
            aria-hidden="true"
          />
          <span className="text-base font-semibold tracking-normal text-copy-primary">
            Ghost AI
          </span>
        </div>

        <div className="my-auto max-w-2xl py-16">
          <p className="text-sm font-semibold text-brand">{tagline}</p>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight tracking-normal text-copy-primary">
            {heading}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-copy-secondary">
            {intro}
          </p>

          <ul className="mt-16 space-y-8">
            {features.map((feature) => (
              <li key={feature.title} className="flex max-w-2xl gap-5">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl border border-subtle-border bg-accent-dim text-brand">
                  <feature.icon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-base font-semibold text-copy-primary">
                    {feature.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-copy-muted">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-copy-faint">
          &copy; 2026 Ghost AI. All rights reserved.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-base px-6 py-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-xl">{children}</div>
      </section>
    </main>
  )
}
