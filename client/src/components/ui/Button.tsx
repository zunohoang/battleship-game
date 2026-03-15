import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

type ButtonVariant = 'default' | 'primary' | 'danger';

type NativeButtonProps = Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart'
>;

type ButtonProps = NativeButtonProps & {
    children: ReactNode;
    variant?: ButtonVariant;
};

const baseClassName =
    'ui-button-shell cursor-pointer h-12 w-full rounded-[var(--hud-radius)] border text-sm font-bold tracking-[0.14em] uppercase';

const disabledClassName =
    'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-inherit';

const variantClassName: Record<ButtonVariant, string> = {
  default: 'ui-button-default',
  primary: 'ui-button-primary',
  danger: 'ui-button-danger',
};

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'default',
  ...props
}: ButtonProps) {
  const buttonClassName =
        `${baseClassName} ${disabledClassName} ${variantClassName[variant]} ${className}`.trim();

  return (
    <motion.button
      type={type}
      className={buttonClassName}
      whileHover={props.disabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={props.disabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
