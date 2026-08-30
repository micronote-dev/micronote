type Props = {
  onClose: () => void;
};

export const useSettingsDialogPresenter = ({ onClose }: Props) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return { handleOpenChange };
};
