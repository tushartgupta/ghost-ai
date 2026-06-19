import { SignUp } from "@clerk/nextjs"
import { FileText, PanelsTopLeft, Users } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { EDITOR_PATH, SIGN_IN_URL } from "@/lib/auth-paths"

const features = [
  {
    title: "Project-owned Workspaces",
    description:
      "Create protected architecture projects with clear ownership and collaborator access.",
    icon: PanelsTopLeft,
  },
  {
    title: "Shared Design Canvas",
    description:
      "Import starters, refine nodes and edges, and keep the whole team in the same model.",
    icon: Users,
  },
  {
    title: "Specification Output",
    description:
      "Turn final architecture decisions into persistent Markdown specs linked to the project.",
    icon: FileText,
  },
]

export default function SignUpPage() {
  return (
    <AuthShell
      tagline="Ghost AI"
      heading="Design systems at the speed of thought."
      intro="Start from a plain-English architecture prompt and shape the result into a shared technical plan."
      features={features}
    >
      <SignUp
        fallbackRedirectUrl={EDITOR_PATH}
        signInUrl={SIGN_IN_URL}
      />
    </AuthShell>
  )
}
