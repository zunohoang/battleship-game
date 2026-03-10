import type { ReactNode } from "react";

type ModalProps = {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
};

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a2c]/65 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-[#7dbde0] bg-[#edf4fb] p-5 text-[#1e3654] shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 id="modal-title" className="text-xl font-black italic">
                        {title}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onClick={onClose}
                        className="cursor-pointer rounded-md border border-[#7dbde0] px-2 py-1 text-sm font-semibold text-[#3d5472] hover:bg-white/70"
                    >
                        ✕
                    </button>
                </div>

                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}
