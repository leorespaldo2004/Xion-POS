"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Monitor, Server, Smartphone } from "lucide-react"

interface OnboardingScreenProps {
  onSelectPrimary: () => void
  onRequestAccess: () => void
}

export function OnboardingScreen({ onSelectPrimary, onRequestAccess }: OnboardingScreenProps) {
  const [subScreen, setSubScreen] = useState<"select" | "secondary">("select")
  const [email, setEmail] = useState("")

  if (subScreen === "secondary") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubScreen("select")}
              className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Volver</span>
            </Button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                Caja Secundaria
              </h2>
              <p className="text-sm text-muted-foreground">
                Solicita vinculación a una caja principal
              </p>
            </div>
          </div>

          <Card className="border-border/50 shadow-2xl">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email de la empresa o caja principal
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="empresa@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-primary/30 focus:border-primary focus:ring-primary text-base"
                />
              </div>

              <Button
                onClick={onRequestAccess}
                className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg"
              >
                Solicitar Acceso
              </Button>

              <Button
                variant="outline"
                onClick={() => setSubScreen("select")}
                className="w-full border-2 rounded-xl text-foreground hover:bg-accent/50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver atrás
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-3xl space-y-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <Monitor className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              Configuración Inicial
            </h1>
            <p className="text-lg text-muted-foreground">
              Selecciona el tipo de caja que deseas configurar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card
            className="cursor-pointer border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/50"
            onClick={onSelectPrimary}
          >
            <CardContent className="flex flex-col items-center gap-5 p-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Server className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  Caja Principal
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Servidor central de la tienda. Administra usuarios, inventario y cajas secundarias.
                </p>
              </div>
              <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Seleccionar
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/50"
            onClick={() => setSubScreen("secondary")}
          >
            <CardContent className="flex flex-col items-center gap-5 p-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Smartphone className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  Caja Secundaria
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Terminal adicional sincronizada. Se vincula a la caja principal.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-2 text-foreground hover:bg-accent/50 font-semibold"
              >
                Seleccionar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
