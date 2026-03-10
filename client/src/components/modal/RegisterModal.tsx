import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type RegisterModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function RegisterModal({ isOpen, onClose, onSubmit }: RegisterModalProps) {
    const { t } = useTranslation("common");

    return (
        <Modal isOpen={isOpen} title={t("welcome.modals.registerTitle")} onClose={onClose}>
            <form className="grid gap-3" onSubmit={onSubmit}>
                <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
                    {t("welcome.modals.username")}
                    <input
                        type="text"
                        required
                        className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
                    />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
                    {t("welcome.modals.email")}
                    <input
                        type="email"
                        required
                        className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
                    />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
                    {t("welcome.modals.password")}
                    <input
                        type="password"
                        required
                        className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
                    />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
                    {t("welcome.modals.confirmPassword")}
                    <input
                        type="password"
                        required
                        className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
                    />
                </label>

                <div className="mt-2 flex gap-3">
                    <Button variant="primary" type="submit" className="h-11">
                        {t("welcome.modals.submitRegister")}
                    </Button>
                    <Button type="button" className="h-11" onClick={onClose}>
                        {t("welcome.modals.cancel")}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
