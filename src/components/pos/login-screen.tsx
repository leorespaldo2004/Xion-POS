"use client"

import { useState } from "react"
import { Lock, User as UserIcon, LogIn, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface LoginScreenProps {
  onLogin: (user: any) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [pin, setPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Bypass para desarrollo: simulamos una petición al API y aceptamos cualquier PIN
    setTimeout(() => {
      setIsLoading(false)
      if (pin.length >= 4) {
        toast.success("Sesión iniciada correctamente")
        onLogin({
          id: "dev-user-id",
          name: "Cajero de Desarrollo",
          role: "manager"
        })
      } else {
        toast.error("El PIN debe tener al menos 4 dígitos")
      }
    }, 800)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-primary/10 blur-3xl opacity-50" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-background/80 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-foreground/80 shadow-lg">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Xion POS</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Ingresa tu PIN de acceso para comenzar tu turno.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-8">
            <div className="space-y-3">
              <Label htmlFor="pin" className="text-sm font-semibold text-foreground/80">
                PIN de Seguridad
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="pl-10 h-14 text-2xl tracking-[0.5em] font-mono text-center shadow-inner bg-secondary/30 border-primary/20 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder="••••"
                  maxLength={12}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Modo Desarrollador Activo: Ingresa cualquier PIN de 4+ dígitos.
              </p>
            </div>
            
            {/* Quick numpad for touch interfaces (Optional but clean) */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map((key) => (
                 <Button
                 key={key}
                 type="button"
                 variant="outline"
                 className="h-14 text-xl font-semibold hover:bg-primary/10 hover:text-primary transition-colors border-border/50"
                 onClick={() => {
                   if (key === 'C') setPin('')
                   else if (key === '←') setPin(prev => prev.slice(0, -1))
                   else setPin(prev => prev + key)
                 }}
               >
                 {key}
               </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || pin.length < 4}
              className="w-full h-14 text-lg font-bold shadow-md bg-primary hover:bg-primary/90 transition-all"
            >
              {isLoading ? (
                "Verificando..."
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" /> Iniciar Sesión
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Footer Branding */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-sm text-muted-foreground font-medium">
          Dolarizado Offline-First • Xion POS
        </p>
      </div>
    </div>
  )
}
