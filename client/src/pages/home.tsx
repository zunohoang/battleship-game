import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  SectionStatus,
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

export function HomePage() {
  const { t } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const { user, setUser } = useGlobalContext();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const {
    modalMode: authModalMode,
    isModalOpen,
    openModal,
    closeModal,
  } = useModalState<AuthModalMode>();

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
    setUser({ username: payload.username, avatarSrc: payload.avatarSrc, signature: payload.signature || null });
    closeModal();
  };

  const handleSubmitForgotPassword = (event: FormEvent<HTMLFormElement>) => {
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

          <div className="mt-10 flex w-full max-w-105 flex-col gap-3">
            {menuItems.map((item) => (
              <Button key={item.id} disabled={item.disabled}>
                {item.label}
              </Button>
            ))}
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
