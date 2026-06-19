import { SignIn } from "@clerk/nextjs"
import { FileText, Network, Sparkles } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { EDITOR_PATH, SIGN_UP_URL } from "@/lib/auth-paths"

const features = [
  {
    title: "AI Architecture Generation",
    description:
      "Describe your system, and Ghost AI maps it into nodes and edges on a live canvas.",
    icon: Sparkles,
  },
  {
    title: "Real-time Collaboration",
    description:
      "Live cursors, presence indicators, and shared node editing across your team.",
    icon: Network,
  },
  {
    title: "Instant Spec Generation",
    description:
      "Export a complete Markdown technical spec directly from the canvas graph.",
    icon: FileText,
  },
]

export default function SignInPage() {
  return (
    <AuthShell
      tagline="Ghost AI"
      heading="Design systems at the speed of thought."
      intro="Describe your architecture in plain English. Ghost AI maps it to a shared canvas your whole team can refine in real time."
      features={features}
    >
      <SignIn
        fallbackRedirectUrl={EDITOR_PATH}
        signUpUrl={SIGN_UP_URL}
      />
    </AuthShell>
  )
}
