"use client"

import { useState } from "react"
import { LoginScreen } from "@/components/pos/login-screen"
import { OnboardingScreen } from "@/components/pos/onboarding-screen"
import { DashboardScreen } from "@/components/pos/dashboard-screen"

type AppView = "login" | "onboarding" | "dashboard"

export default function Page() {
  const [view, setView] = useState<AppView>("login")

  if (view === "login") {
    return <LoginScreen onLogin={() => setView("onboarding")} />
  }

  if (view === "onboarding") {
    return (
      <OnboardingScreen
        onSelectPrimary={() => setView("dashboard")}
        onRequestAccess={() => setView("dashboard")}
      />
    )
  }

  return <DashboardScreen onLogout={() => setView("login")} />
}
