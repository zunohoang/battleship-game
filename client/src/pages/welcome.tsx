import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ForgotPasswordModal,
  LoginModal,
  RegisterModal,
} from '@/components';
import { useModalState } from '@/hooks/useModalState';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import * as authService from '@/services/authService';
import { getApiErrorCode, isGloballyHandledApiError } from '@/services/httpError';
import {
  validateLoginInput,
  validateRegisterInput,
} from '@/utils/authValidation';

type AuthModalMode = 'login' | 'register' | 'forgotPassword';

export function WelcomePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { setUser } = useGlobalContext();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const {
    modalMode: authModalMode,
    isModalOpen,
    openModal,
    closeModal,
  } = useModalState<AuthModalMode>();

  const handlePlayAnonymous = () => {
    navigate('/home');
  };

  const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);

    const formData = new FormData(event.currentTarget);
    const rawEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
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

      navigate('/home');
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
    const rawUsername = String(formData.get('username') ?? '');
    const rawEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
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

      navigate('/home', { state: { openProfileSetup: true } });
    } catch (error) {
      if (isGloballyHandledApiError(error)) {
        return;
      }
      setRegisterError(t(`errors.${getApiErrorCode(error)}`));
    }
  };

  const handleSubmitForgotPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const featureItems = [
    {
      label: t('welcome.featureLabels.webgame'),
      description: t('welcome.features.webgame'),
    },
    {
      label: t('welcome.featureLabels.matchmaking'),
      description: t('welcome.features.matchmaking'),
    },
    {
      label: t('welcome.featureLabels.ai'),
      description: t('welcome.features.ai'),
    },
    {
      label: t('welcome.featureLabels.progress'),
      description: t('welcome.features.progress'),
    },
  ];

  return (
    <main className='relative min-h-screen overflow-hidden  text-(--text-main)'>
      <div
        className='absolute inset-0 -z-20 bg-cover bg-center'
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(228, 238, 249, 0.62), rgba(241, 246, 252, 0.78)), url("/theme-battleship.jpg")',
        }}
      />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_55%)]' />

      <section className='grid min-h-screen min-w-screen max-w-7xl overflow-hidden rounded-md border border-white/55 bg-white/18 backdrop-blur-[2px] md:grid-cols-6'>
        <div className='flex flex-col items-center justify-center bg-[#1e3654]/88 p-6 text-[#d9ebff] md:col-span-2 sm:p-8'>
          <p className='text-[11px] font-semibold tracking-[0.35em] text-[#9fc3eb] uppercase'>
            {t('welcome.subtitle')}
          </p>
          <h1 className='mt-4 text-2xl leading-[0.95] font-black text-white italic sm:text-3xl'>
            {t('welcome.title')}
          </h1>

          <div className=' mt-10 flex w-full max-w-90 flex-col gap-3'>
            <Button onClick={handlePlayAnonymous}>
              {t('welcome.actions.playAnonymous')}
            </Button>
            <Button variant='primary' onClick={() => openModal('register')}>
              {t('welcome.actions.register')}
            </Button>
          </div>

          <p className='mt-5 text-sm text-[#c1dbf8]'>
            {t('welcome.actions.hasAccount')}{' '}
            <a
              href='#'
              onClick={(event) => {
                event.preventDefault();
                setLoginError(null);
                openModal('login');
              }}
              className='font-semibold text-white underline underline-offset-2 hover:text-[#e8f3ff]'
            >
              {t('welcome.actions.login')}
            </a>
          </p>
        </div>

        <div className=' flex flex-col items-center justify-center bg-[#edf4fb]/86 p-6 md:col-span-4 sm:p-8'>
          <h1 className='mt-4 text-2xl leading-[0.95] font-black text-[#1c3658] italic sm:text-4xl'>
            {t('welcome.gameName')}
          </h1>
          <div className='mt-6 grid gap-3'>
            {featureItems.map((featureItem) => (
              <article
                key={featureItem.label}
                className='border rounded-sm border-[#7dbde0] bg-white/70 p-4 text-[#3d5472]'
              >
                <p className='text-xs font-bold tracking-[0.12em] uppercase'>
                  {featureItem.label}
                </p>
                <p className='mt-2 text-sm font-semibold'>
                  {featureItem.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={isModalOpen && authModalMode === 'login'}
        onClose={closeModal}
        onSubmit={handleSubmitLogin}
        onForgotPassword={() => openModal('forgotPassword')}
        onFieldsChange={() => setLoginError(null)}
        errorMessage={loginError ?? undefined}
      />

      <RegisterModal
        isOpen={isModalOpen && authModalMode === 'register'}
        onClose={closeModal}
        onSubmit={handleSubmitRegister}
        onFieldsChange={() => setRegisterError(null)}
        errorMessage={registerError ?? undefined}
      />

      <ForgotPasswordModal
        isOpen={isModalOpen && authModalMode === 'forgotPassword'}
        onClose={closeModal}
        onSubmit={handleSubmitForgotPassword}
      />
    </main>
  );
}
