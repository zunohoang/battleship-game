import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "default" | "primary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
};

const baseClassName =
    "cursor-pointer h-12 rounded-2xl w-full border text-sm font-bold tracking-[0.14em] uppercase transition";

const disabledClassName = "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-inherit";

const variantClassName: Record<ButtonVariant, string> = {
    default: "ui-button-default",
    primary: "ui-button-primary",
};

export function Button({
    children,
    className = "",
    type = "button",
    variant = "default",
    ...props
}: ButtonProps) {
    const buttonClassName =
        `${baseClassName} ${disabledClassName} ${variantClassName[variant]} ${className}`.trim();

    return (
        <button type={type} className={buttonClassName} {...props}>
            {children}
        </button>
    );
}
