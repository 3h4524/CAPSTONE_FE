import { create } from "zustand";

export type PopupOptions = {
  title: string;
  description?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  showCloseButton?: boolean;
  onPositive?: () => void;
  onNegative?: () => void;
};

type PopupState = {
  isOpen: boolean;
  title: string;
  description?: string;
  positiveLabel: string;
  negativeLabel: string;
  showCloseButton: boolean;
  onPositive?: () => void;
  onNegative?: () => void;
  openPopup: (options: PopupOptions) => void;
  closePopup: () => void;
};

const DEFAULT_POSITIVE_LABEL = "Confirm";
const DEFAULT_NEGATIVE_LABEL = "Cancel";

export const usePopupStore = create<PopupState>((set) => ({
  isOpen: false,
  title: "",
  description: undefined,
  positiveLabel: DEFAULT_POSITIVE_LABEL,
  negativeLabel: DEFAULT_NEGATIVE_LABEL,
  showCloseButton: true,

  openPopup: (options) =>
    set({
      title: options.title,
      description: options.description,
      positiveLabel: options.positiveLabel ?? DEFAULT_POSITIVE_LABEL,
      negativeLabel: options.negativeLabel ?? DEFAULT_NEGATIVE_LABEL,
      showCloseButton: options.showCloseButton ?? true,
      onPositive: options.onPositive,
      onNegative: options.onNegative,
      isOpen: true,
    }),

  closePopup: () =>
    set({
      isOpen: false,
      onPositive: undefined,
      onNegative: undefined,
    }),
}));
