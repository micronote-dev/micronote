/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowRightIcon } from "lucide-react";
import { useDirSelectDialogFacade } from "./dir-select-dialog.facade";
type Props = {
    isOpen: boolean;
    onClose: () => void;
}


export const DirSelectDialog = ({ isOpen, onClose }: Props) => {
    const {handleSelectPath, handleSetNotePath} = useDirSelectDialogFacade({onClose})
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) onClose()}}>
      <DialogContent>
        <div className="border rounded p-2 m-4 flex items-center justify-between hover:bg-gray-100 cursor-pointer">
          <Label className="">
            {/* @ts-expect-error */}
            <input type="file" style={{ display: "none" }} directory="" webkitdirectory="" onChange={handleSelectPath}/>
            <p>Select Save Notes Folder</p>
          </Label>
          <Button variant={"default"} onClick={handleSetNotePath}>
            <ArrowRightIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
