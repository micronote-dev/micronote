import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Props = {
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

const parseDate = (value: string | null) => {
  if (!value) return undefined
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function DatePicker({ value, onValueChange, placeholder = "Pick a date", className }: Props) {
  const [open, setOpen] = useState(false)
  const selected = parseDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start px-3 text-left font-normal", !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4" />
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onValueChange(date ? format(date, "yyyy-MM-dd") : null)
            if (date) setOpen(false)
          }}
          autoFocus
        />
        {selected && (
          <div className="border-t p-2">
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { onValueChange(null); setOpen(false) }}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
