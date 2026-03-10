import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ForgotPasswordModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ForgotPasswordModal({ isOpen, onClose, onSubmit }: ForgotPasswordModalProps) {
    const { t } = useTranslation("common");

    return (
        <Modal isOpen={isOpen} title={t("welcome.modals.forgotPasswordTitle")} onClose={onClose}>
            <form className="grid gap-3" onSubmit={onSubmit}>
                <p className="text-sm text-[#3d5472]">{t("welcome.modals.forgotPasswordDescription")}</p>

                <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
                    {t("welcome.modals.email")}
                    <input
                        type="email"
                        required
                        className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
                    />
                </label>

                <div className="mt-2 flex gap-3">
                    <Button variant="primary" type="submit" className="h-11">
                        {t("welcome.modals.submitForgotPassword")}
                    </Button>
                    <Button type="button" className="h-11" onClick={onClose}>
                        {t("welcome.modals.cancel")}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
