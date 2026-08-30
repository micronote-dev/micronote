import { Button } from "@/components/ui/button";
import { FolderOpenIcon } from "lucide-react";
import appIcon from "../../../../../build/appicon.png";

type Props = {
  onSelectDirectory: () => void;
  requiresDirectory: boolean;
};

export const StartScreen = ({ onSelectDirectory, requiresDirectory }: Props) => (
  <main className="flex h-svh w-full items-center justify-center px-6">
    <section className="flex max-w-sm flex-col items-center text-center">
      <img src={appIcon} alt="Micro Note" className="mb-6 size-28 rounded-[24%] object-cover shadow-xl" />
      <h1 className="text-xl font-semibold">
        {requiresDirectory ? "Choose your notes folder" : "Choose a note"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {requiresDirectory
          ? "Select the folder where your notes are stored. It will appear as the root of the file tree."
          : "Choose a note from the file tree, or switch to a different notes folder."}
      </p>
      <Button className="mt-6" onClick={onSelectDirectory}>
        <FolderOpenIcon className="mr-2 size-4" />
        {requiresDirectory ? "Choose folder" : "Change folder"}
      </Button>
    </section>
  </main>
);
