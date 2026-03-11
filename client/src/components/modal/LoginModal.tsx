import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onForgotPassword: () => void;
  onFieldsChange?: () => void;
  errorMessage?: string;
};

export function LoginModal({
  isOpen,
  onClose,
  onSubmit,
  onForgotPassword,
  onFieldsChange,
  errorMessage,
}: LoginModalProps) {
  const { t } = useTranslation("common");

  return (
    <Modal
      isOpen={isOpen}
      title={t("welcome.modals.loginTitle")}
      onClose={onClose}
    >
      <form
        className="grid gap-3"
        noValidate
        onSubmit={onSubmit}
        onChange={onFieldsChange}
      >
        <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
          {t("welcome.modals.email")}
          <input
            type="email"
            name="email"
            required
            className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
          {t("welcome.modals.password")}
          <input
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={72}
            className="h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]"
          />
        </label>

        <button
          type="button"
          onClick={onForgotPassword}
          className="justify-self-start text-sm font-semibold text-[#2f5f98] underline underline-offset-2 hover:text-[#1f4d84]"
        >
          {t("welcome.modals.forgotPassword")}
        </button>

        {errorMessage && (
          <p className="rounded-xl border border-[#d36b6b] bg-[#ffe8e8] px-3 py-2 text-sm font-semibold text-[#8f2f2f]">
            {errorMessage}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <Button variant="primary" type="submit" className="h-11">
            {t("welcome.modals.submitLogin")}
          </Button>
          <Button type="button" className="h-11" onClick={onClose}>
            {t("welcome.modals.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
