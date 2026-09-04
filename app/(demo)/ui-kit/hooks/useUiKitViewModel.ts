"use client";

import { useState } from "react";

interface UseUiKitViewModelReturn {
  isChecked: boolean;
  toggleChecked: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  inputValue: string;
  setInputValue: (value: string) => void;
}

/** Estado local de la página de demo — no hay estado de servidor acá. */
export const useUiKitViewModel = (): UseUiKitViewModelReturn => {
  const [isChecked, setIsChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return {
    isChecked,
    toggleChecked: () => setIsChecked((previous) => !previous),
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    inputValue,
    setInputValue,
  };
};
