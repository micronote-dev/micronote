import * as React from "react"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 sm:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex items-center justify-between", defaultClassNames.nav),
        button_previous: cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "z-10 size-7 bg-transparent p-0 opacity-70 hover:opacity-100", defaultClassNames.button_previous),
        button_next: cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "z-10 size-7 bg-transparent p-0 opacity-70 hover:opacity-100", defaultClassNames.button_next),
        month_caption: cn("flex h-7 items-center justify-center px-8", defaultClassNames.month_caption),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn("w-8 rounded-md text-center text-[0.8rem] font-normal text-muted-foreground", defaultClassNames.weekday),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn("relative size-8 p-0 text-center text-sm", defaultClassNames.day),
        day_button: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8 p-0 font-normal aria-selected:opacity-100", defaultClassNames.day_button),
        selected: cn("[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground", defaultClassNames.selected),
        today: cn("[&>button]:bg-accent [&>button]:text-accent-foreground", defaultClassNames.today),
        outside: cn("text-muted-foreground opacity-50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation }) => {
          const Icon = orientation === "left"
            ? ChevronLeftIcon
            : orientation === "right"
              ? ChevronRightIcon
              : orientation === "up"
                ? ChevronUpIcon
                : ChevronDownIcon
          return <Icon className={cn("size-4", chevronClassName)} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
