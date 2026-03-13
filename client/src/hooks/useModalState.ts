import { useState } from 'react';

export function useModalState<TMode extends string>() {
  const [modalMode, setModalMode] = useState<TMode | null>(null);

  const openModal = (mode: TMode) => {
    setModalMode(mode);
  };

  const closeModal = () => {
    setModalMode(null);
  };

  return {
    modalMode,
    isModalOpen: modalMode !== null,
    openModal,
    closeModal,
  };
}
