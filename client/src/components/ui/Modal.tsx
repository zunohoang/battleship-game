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
            className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="ui-modal-surface w-full max-w-md rounded-2xl border p-5 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 id="modal-title" className="text-xl font-black italic">
                        {title}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onClick={onClose}
                        className="ui-button-default cursor-pointer rounded-md border px-2 py-1 text-sm font-semibold"
                    >
                        ✕
                    </button>
                </div>

                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}
