import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
    Button,
    SectionStatus,
    ForgotPasswordModal,
    LoginModal,
    RegisterModal,
} from "@/components";
import { useModalState } from "@/hooks/useModalState";

type AuthModalMode = "login" | "register" | "forgotPassword";

export function HomePage() {
    const { t } = useTranslation("common");
    const [searchParams] = useSearchParams();
    const currentYear = new Date().getFullYear();
    const {
        modalMode: authModalMode,
        isModalOpen,
        openModal,
        closeModal,
    } = useModalState<AuthModalMode>();

    const handleSubmitAuth = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    const username = searchParams.get("username")?.trim() || t("home.playerStatus.defaultUsername");
    const isAnonymous = searchParams.get("status") === "anonymous";
    const status =
        isAnonymous
            ? t("home.playerStatus.anonymous")
            : t("home.playerStatus.commander", { username });

    const menuItems = [
        {
            id: "playOnline",
            label: t("home.menu.playOnline"),
            disabled: isAnonymous,
        },
        {
            id: "playBot",
            label: t("home.menu.playBot"),
            disabled: false,
        },

        {
            id: "botVsBot",
            label: t("home.menu.botVsBot"),
            disabled: false,
        },
        {
            id: "settings",
            label: t("home.menu.settings"),
            disabled: false,
        },
    ];

    return (
        <main className="relative min-h-screen overflow-hidden px-4 py-6 text-(--text-main) sm:px-8">
            <div
                className="absolute inset-0 -z-20 bg-cover bg-center"
                style={{
                    backgroundImage:
                        'linear-gradient(to bottom, rgba(228, 238, 249, 0.65), rgba(241, 246, 252, 0.78)), url("/theme-battleship.jpg")',
                }}
            />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.26),transparent_55%)]" />

            <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col rounded-2xl border border-white/55 bg-white/18 p-5 backdrop-blur-[2px] sm:p-8">
                <SectionStatus
                    leftText={t("home.status.sectors")}
                    rightText={t("home.status.coordinates")}
                />

                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <p className="mb-4 text-[11px] font-semibold tracking-[0.45em] text-[#708aac] uppercase sm:text-xs">
                        {t("home.title")}
                    </p>
                    <h1 className="text-5xl leading-[0.95] font-black text-[#1c3658] italic sm:text-7xl">
                        BATTLESHIP:
                        <br />
                        COMMAND
                    </h1>

                    <p className="mt-4 text-xs font-semibold tracking-[0.22em] text-[#5f7da1] uppercase">
                        {t("home.playerStatus.label")}: {status}
                    </p>

                    <div className="mt-10 flex w-full max-w-[420px] flex-col gap-3">
                        {menuItems.map((item) => (
                            <Button key={item.id} disabled={item.disabled}>
                                {item.label}
                            </Button>
                        ))}
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                onClick={() => {
                                    openModal("login");
                                }}
                            >
                                {t("home.menu.login")}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    openModal("register");
                                }}
                            >
                                {t("home.menu.register")}
                            </Button>
                        </div>
                    </div>

                    {isAnonymous && (
                        <p className="mt-3 text-xs font-semibold text-[#4f6b8f]">
                            {t("home.accessRules.anonymous")}
                        </p>
                    )}

                    <p className="mt-8 text-[10px] font-semibold tracking-[0.15em] text-[#8ea8c7] uppercase">
                        © {currentYear} {t("home.copyright")}
                    </p>
                </div>

                <SectionStatus
                    leftText={t("home.status.system")}
                    rightText={t("home.status.radar")}
                    className="mt-auto"
                />
            </section>
            <LoginModal
                isOpen={isModalOpen && authModalMode === "login"}
                onClose={closeModal}
                onSubmit={handleSubmitAuth}
                onForgotPassword={() => openModal("forgotPassword")}
            />

            <RegisterModal
                isOpen={isModalOpen && authModalMode === "register"}
                onClose={closeModal}
                onSubmit={handleSubmitAuth}
            />

            <ForgotPasswordModal
                isOpen={isModalOpen && authModalMode === "forgotPassword"}
                onClose={closeModal}
                onSubmit={handleSubmitAuth}
            />
        </main>
    );
}
