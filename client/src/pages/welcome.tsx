import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    Button,
    ForgotPasswordModal,
    LoginModal,
    RegisterModal,
    ProfileSetupModal,
} from "@/components";
import type { ProfileSetupPayload } from "@/components/modal/ProfileSetupModal";
import { useModalState } from "@/hooks/useModalState";
import { useGlobalContext } from "@/hooks/useGlobalContext";
import * as authService from "@/services/authService";
import { getHttpErrorKind } from "@/services/httpError";
import defaultAvatarSrc from "@/assets/images/default-avatar.svg";

type AuthModalMode = "login" | "register" | "forgotPassword" | "profileSetup";

function normalizeAvatar(avatar: string | null): string {
    if (!avatar) {
        return defaultAvatarSrc;
    }

    return avatar;
}

export function WelcomePage() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const { user, setUser } = useGlobalContext();
    const [loginError, setLoginError] = useState<string | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const {
        modalMode: authModalMode,
        isModalOpen,
        openModal,
        closeModal,
    } = useModalState<AuthModalMode>();

    const handlePlayAnonymous = () => {
        navigate("/home?status=anonymous");
    };

    const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");

        if (!email || !password) {
            return;
        }

        try {
            const response = await authService.login({
                email,
                password,
            });

            setUser({
                username: response.user.username,
                avatarSrc: normalizeAvatar(response.user.avatar),
                signature: response.user.signature,
            });

            closeModal();
        } catch (error) {
            const errorKind = getHttpErrorKind(error);
            if (errorKind === "timeout") {
                setLoginError(t("welcome.modals.errors.timeout"));
                return;
            }

            if (errorKind === "network") {
                setLoginError(t("welcome.modals.errors.network"));
                return;
            }

            setLoginError(t("welcome.modals.errors.generic"));
        }
    };

    const handleSubmitRegister = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setRegisterError(null);

        const formData = new FormData(event.currentTarget);
        const username = String(formData.get("username") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (!username || !email || !password || password !== confirmPassword) {
            return;
        }

        try {
            const response = await authService.register({
                username,
                email,
                password,
            });

            setUser({
                username: response.user.username,
                avatarSrc: defaultAvatarSrc,
                signature: null,
            });

            openModal("profileSetup");
        } catch (error) {
            const errorKind = getHttpErrorKind(error);
            if (errorKind === "timeout") {
                setRegisterError(t("welcome.modals.errors.timeout"));
                return;
            }

            if (errorKind === "network") {
                setRegisterError(t("welcome.modals.errors.network"));
                return;
            }

            setRegisterError(t("welcome.modals.errors.generic"));
        }
    };

    const handleSubmitProfileSetup = (payload: ProfileSetupPayload) => {
        setUser({
            username: payload.username,
            avatarSrc: payload.avatarSrc,
            signature: payload.signature || null,
        });
        closeModal();
    };

    const handleSubmitForgotPassword = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    const featureItems = [
        {
            label: t("welcome.featureLabels.webgame"),
            description: t("welcome.features.webgame"),
        },
        {
            label: t("welcome.featureLabels.matchmaking"),
            description: t("welcome.features.matchmaking"),
        },
        {
            label: t("welcome.featureLabels.ai"),
            description: t("welcome.features.ai"),
        },
        {
            label: t("welcome.featureLabels.progress"),
            description: t("welcome.features.progress"),
        },
    ];

    return (
        <main className="relative min-h-screen overflow-hidden  text-(--text-main)">
            <div
                className="absolute inset-0 -z-20 bg-cover bg-center"
                style={{
                    backgroundImage:
                        'linear-gradient(to bottom, rgba(228, 238, 249, 0.62), rgba(241, 246, 252, 0.78)), url("/theme-battleship.jpg")',
                }}
            />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_55%)]" />

            <section className="grid min-h-screen min-w-screen max-w-7xl overflow-hidden rounded-2xl border border-white/55 bg-white/18 backdrop-blur-[2px] md:grid-cols-6">
                <div className="flex flex-col items-center justify-center bg-[#1e3654]/88 p-6 text-[#d9ebff] md:col-span-2 sm:p-8">
                    <p className="text-[11px] font-semibold tracking-[0.35em] text-[#9fc3eb] uppercase">
                        {t("welcome.subtitle")}
                    </p>
                    <h1 className="mt-4 text-2xl leading-[0.95] font-black text-white italic sm:text-3xl">
                        {t("welcome.title")}
                    </h1>

                    <div className=" mt-10 flex w-full max-w-90 flex-col gap-3">
                        <Button onClick={handlePlayAnonymous}>
                            {t("welcome.actions.playAnonymous")}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => openModal("register")}
                        >
                            {t("welcome.actions.register")}
                        </Button>
                    </div>

                    <p className="mt-5 text-sm text-[#c1dbf8]">
                        {t("welcome.actions.hasAccount")}{" "}
                        <a
                            href="#"
                            onClick={(event) => {
                                event.preventDefault();
                                setLoginError(null);
                                openModal("login");
                            }}
                            className="font-semibold text-white underline underline-offset-2 hover:text-[#e8f3ff]"
                        >
                            {t("welcome.actions.login")}
                        </a>
                    </p>
                </div>

                <div className=" flex flex-col items-center justify-center bg-[#edf4fb]/86 p-6 md:col-span-4 sm:p-8">
                    <h1 className="mt-4 text-2xl leading-[0.95] font-black text-[#1c3658] italic sm:text-4xl">
                        {t("welcome.gameName")}
                    </h1>
                    <div className="mt-6 grid gap-3">
                        {featureItems.map((featureItem) => (
                            <article
                                key={featureItem.label}
                                className="border rounded-2xl border-[#7dbde0] bg-white/70 p-4 text-[#3d5472]"
                            >
                                <p className="text-xs font-bold tracking-[0.12em] uppercase">
                                    {featureItem.label}
                                </p>
                                <p className="mt-2 text-sm font-semibold">
                                    {featureItem.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <LoginModal
                isOpen={isModalOpen && authModalMode === "login"}
                onClose={closeModal}
                onSubmit={handleSubmitLogin}
                onForgotPassword={() => openModal("forgotPassword")}
                errorMessage={loginError ?? undefined}
            />

            <RegisterModal
                isOpen={isModalOpen && authModalMode === "register"}
                onClose={closeModal}
                onSubmit={handleSubmitRegister}
                errorMessage={registerError ?? undefined}
            />

            <ForgotPasswordModal
                isOpen={isModalOpen && authModalMode === "forgotPassword"}
                onClose={closeModal}
                onSubmit={handleSubmitForgotPassword}
            />

            <ProfileSetupModal
                key={authModalMode}
                isOpen={isModalOpen && authModalMode === "profileSetup"}
                onClose={closeModal}
                onSubmit={handleSubmitProfileSetup}
                username={user?.username ?? ""}
            />
        </main>
    );
}
