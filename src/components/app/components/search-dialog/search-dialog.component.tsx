import { Command, CommandDialog } from "@/components/ui/command";
import { CommandInput } from "cmdk";

export function SearchDialogComponent() {
  return (
    <CommandDialog>
      <Command>
        <CommandInput />
      </Command>
    </CommandDialog>
  );
}
