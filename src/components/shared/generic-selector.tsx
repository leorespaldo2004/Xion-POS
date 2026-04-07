"use client"

import * as React from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Search, Check, Layers, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GenericSelectorProps<T> {
  title: string
  description?: string
  placeholder?: string
  items: T[]
  onSelect: (item: T) => void
  renderItem: (item: T) => React.ReactNode
  getItemValue: (item: T) => string
  selectedValue?: string
  trigger?: React.ReactNode
  isLoading?: boolean
  emptyMessage?: string
}

export function GenericSelector<T>({
  title,
  description,
  placeholder = "Buscar...",
  items,
  onSelect,
  renderItem,
  getItemValue,
  selectedValue,
  trigger,
  isLoading = false,
  emptyMessage = "No se encontraron resultados."
}: GenericSelectorProps<T>) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-between font-normal hover:border-primary/50 transition-all">
            <span className="truncate">{selectedValue || "Seleccionar..."}</span>
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-md">
        <DialogHeader className="p-4 border-b bg-secondary/15">
          <DialogTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2 text-primary">
            <Layers className="w-5 h-5" />
            {title}
          </DialogTitle>
          {description && <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{description}</p>}
        </DialogHeader>
        <Command className="rounded-none bg-transparent">
          <div className="border-b px-2">
            <CommandInput 
                placeholder={placeholder} 
                className="h-12 border-none focus:ring-0 text-sm placeholder:text-muted-foreground/50"
            />
          </div>
          <CommandList className="max-h-[350px] overflow-y-auto p-2 no-scrollbar">
            {isLoading ? (
               <div className="p-12 flex flex-col items-center gap-3 opacity-60">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sincronizando datos...</p>
               </div>
            ) : (
                <>
                <CommandEmpty className="p-12 text-center flex flex-col items-center gap-3 opacity-40">
                    <Search className="w-10 h-10 text-muted-foreground" />
                    <p className="text-xs font-black uppercase tracking-widest">{emptyMessage}</p>
                </CommandEmpty>
                <CommandGroup className="px-1">
                    {items.map((item) => {
                        const val = getItemValue(item)
                        const isSelected = selectedValue === val
                        
                        return (
                            <CommandItem
                                key={val}
                                value={val}
                                onSelect={() => {
                                    onSelect(item)
                                    setOpen(false)
                                }}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all mb-1.5 border border-transparent",
                                    "hover:bg-primary/5 hover:border-primary/20 hover:translate-x-1",
                                    isSelected && "bg-primary/10 border-primary/20"
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    {renderItem(item)}
                                </div>
                                {isSelected && (
                                    <div className="bg-primary text-primary-foreground rounded-full p-1 ml-2 animate-in zoom-in-50 duration-300">
                                        <Check className="h-3 w-3 bold" />
                                    </div>
                                )}
                            </CommandItem>
                        )
                    })}
                </CommandGroup>
                </>
            )}
          </CommandList>
        </Command>
        <div className="p-3 bg-muted/30 border-t flex justify-center">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
               Xion POS Selector • Genérico v1.0
            </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
