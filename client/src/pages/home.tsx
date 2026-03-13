import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Button,
    SectionStatus,
    ForgotPasswordModal,
    LoginModal,
    RegisterModal,
    ProfileSetupModal,
    SettingsModal,
} from "@/components";
import type { ProfileSetupPayload } from "@/components/modal/ProfileSetupModal";
import { useModalState } from "@/hooks/useModalState";
import { useGlobalContext } from "@/hooks/useGlobalContext";
import * as authService from "@/services/authService";
import {
    getApiErrorCode,
    isGloballyHandledApiError,
} from "@/services/httpError";
import {
    validateLoginInput,
    validateRegisterInput,
} from "@/utils/authValidation";

type AuthModalMode =
    | "login"
    | "register"
    | "forgotPassword"
    | "profileSetup"
    | "settings";

type HomeNavigationState = {
    openProfileSetup?: boolean;
};

export function HomePage() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const location = useLocation();
    const currentYear = new Date().getFullYear();
    const { user, setUser, logout } = useGlobalContext();
    const [loginError, setLoginError] = useState<string | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const {
        modalMode: authModalMode,
        isModalOpen,
        openModal,
        closeModal,
    } = useModalState<AuthModalMode>();
    const navigationState = useMemo(
        () => (location.state as HomeNavigationState | null) ?? null,
        [location.state],
    );

    useEffect(() => {
        if (!navigationState?.openProfileSetup) {
            return;
        }

        openModal("profileSetup");
        navigate(`${location.pathname}${location.search}`, {
            replace: true,
            state: null,
        });
    }, [
        location.pathname,
        location.search,
        navigate,
        navigationState,
        openModal,
    ]);

    const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError(null);
        const formData = new FormData(event.currentTarget);
        const rawEmail = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        const { email, errorCode } = validateLoginInput(rawEmail, password);

        if (errorCode) {
            setLoginError(t(`errors.${errorCode}`));
            return;
        }

        try {
            const response = await authService.login({
                email,
                password,
            });

            setUser({
                username: response.user.username,
                avatar: response.user.avatar,
                signature: response.user.signature,
            });

            closeModal();
        } catch (error) {
            if (isGloballyHandledApiError(error)) {
                return;
            }
            setLoginError(t(`errors.${getApiErrorCode(error)}`));
        }
    };

    const handleSubmitRegister = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setRegisterError(null);
        const formData = new FormData(event.currentTarget);
        const rawUsername = String(formData.get("username") ?? "");
        const rawEmail = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");
        const { username, email, errorCode } = validateRegisterInput(
            rawUsername,
            rawEmail,
            password,
            confirmPassword,
        );

        if (errorCode) {
            setRegisterError(t(`errors.${errorCode}`));
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
                avatar: response.user.avatar,
                signature: null,
            });

            openModal("profileSetup");
        } catch (error) {
            if (isGloballyHandledApiError(error)) {
                return;
            }
            setRegisterError(t(`errors.${getApiErrorCode(error)}`));
        }
    };

    const handleSubmitProfileSetup = async (
        payload: ProfileSetupPayload,
    ): Promise<string | null> => {
        try {
            const response = await authService.updateProfile({
                username: payload.username,
                signature: payload.signature,
                password: payload.password,
                avatarFile: payload.avatarFile,
            });

            setUser({
                username: response.user.username,
                avatar: response.user.avatar,
                signature: response.user.signature,
            });
            closeModal();

            return null;
        } catch (error) {
            if (isGloballyHandledApiError(error)) {
                return null;
            }
            return t(`errors.${getApiErrorCode(error)}`);
        }
    };

    const handleLogout = async (): Promise<void> => {
        try {
            await authService.logout();
        } finally {
            logout();
            closeModal();
            navigate("/home");
        }
    };

    const handleSubmitForgotPassword = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    const username =
        user?.username?.trim() ||
        t("home.playerStatus.defaultUsername");
    const isAnonymous = !user;
    const commanderText = t("home.playerStatus.commander", { username });
    const commanderTextParts = commanderText.split(username);
    const isProfileSetupOpen = isModalOpen && authModalMode === "profileSetup";
    const profileSetupModalKey = [
        "profileSetup",
        isProfileSetupOpen ? "open" : "closed",
        user?.username ?? "",
        user?.signature ?? "",
        user?.avatar ?? "",
    ].join(":");

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

    const gameModeMap: Record<string, string> = {
        playOnline: 'online',
        playBot: 'bot',
        botVsBot: 'botvbot',
    };

    const handleGameMode = (id: string) => {
        if (id === "settings") {
            openModal("settings");
            return;
        }

        const mode = gameModeMap[id];
        if (mode) {
            navigate('/game/setup', { state: { mode } });
        }
    };

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
                        {t("home.playerStatus.label")}:{" "}
                        {isAnonymous || !user ? (
                            t("home.playerStatus.anonymous")
                        ) : (
                            <>
                                <span>{commanderTextParts[0] ?? ""}</span>
                                <button
                                    type="button"
                                    onClick={() => openModal("profileSetup")}
                                    className="cursor-pointer font-semibold text-[#365b87] underline underline-offset-3 transition-colors hover:text-[#1f426b]"
                                >
                                    {username}
                                </button>
                                <span>
                                    {commanderTextParts.slice(1).join(username)}
                                </span>
                            </>
                        )}
                    </p>

                    <div className="mt-10 flex w-full max-w-105 flex-col gap-3">
                        {menuItems.map((item) => (
                            <Button
                                key={item.id}
                                disabled={item.disabled}
                                onClick={() => handleGameMode(item.id)}
                            >
                                {item.label}
                            </Button>
                        ))}
                        {user ? (
                            <Button
                                onClick={() => {
                                    void handleLogout();
                                }}
                                className="w-auto border-[#c67e7e] bg-[#ffeaea]/90 text-[#8f2f2f] shadow-md backdrop-blur-sm hover:bg-[#ffd5d5]"
                            >
                                {t("welcome.modals.logout")}
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setLoginError(null);
                                        openModal("login");
                                    }}
                                >
                                    {t("home.menu.login")}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setRegisterError(null);
                                        openModal("register");
                                    }}
                                >
                                    {t("home.menu.register")}
                                </Button>
                            </div>
                        )}
                    </div>

                    {(isAnonymous || !user) && (
                        <p className="mt-3 text-xs font-semibold text-[#4f6b8f]">
                            {t("home.accessRules.anonymous")}
                        </p>
                    )}

                    <p className="mt-8 text-[10px] font-semibold tracking-[0.15em] text-[#8ea8c7] uppercase">
                        © {currentYear} {t("home.copyright")}
                    </p>
                </div>

                <SectionStatus
                    className="mt-auto"
                    leftText={t("home.status.system")}
                    rightText={t("home.status.radar")}
                />
            </section>

            <LoginModal
                isOpen={isModalOpen && authModalMode === "login"}
                onClose={closeModal}
                onSubmit={handleSubmitLogin}
                onForgotPassword={() => openModal("forgotPassword")}
                onFieldsChange={() => setLoginError(null)}
                errorMessage={loginError ?? undefined}
            />

            <RegisterModal
                isOpen={isModalOpen && authModalMode === "register"}
                onClose={closeModal}
                onSubmit={handleSubmitRegister}
                onFieldsChange={() => setRegisterError(null)}
                errorMessage={registerError ?? undefined}
            />

            <ForgotPasswordModal
                isOpen={isModalOpen && authModalMode === "forgotPassword"}
                onClose={closeModal}
                onSubmit={handleSubmitForgotPassword}
            />

            <ProfileSetupModal
                key={profileSetupModalKey}
                isOpen={isProfileSetupOpen}
                onClose={closeModal}
                onSubmit={handleSubmitProfileSetup}
                onLogout={handleLogout}
                username={user?.username ?? ""}
                signature={user?.signature}
                avatar={user?.avatar}
            />

            <SettingsModal
                isOpen={isModalOpen && authModalMode === "settings"}
                onClose={closeModal}
            />
        </main>
    );
}
