import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  disableDecrease?: boolean;
  disableIncrease?: boolean;
  className?: string;
  valueClassName?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  onChange: (value: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function NumberStepper({
  value,
  min,
  max,
  disabled = false,
  disableDecrease = false,
  disableIncrease = false,
  className = '',
  valueClassName = '',
  decrementLabel = 'Decrease value',
  incrementLabel = 'Increase value',
  onChange,
}: NumberStepperProps) {
  const canDecrease = !disabled && !disableDecrease && value > min;
  const canIncrease = !disabled && !disableIncrease && value < max;

  const handleDecrease = () => {
    if (!canDecrease) {
      return;
    }

    onChange(clamp(value - 1, min, max));
  };

  const handleIncrease = () => {
    if (!canIncrease) {
      return;
    }

    onChange(clamp(value + 1, min, max));
  };

  return (
    <div
      className={`ui-stepper ${className}`.trim()}
      role='group'
      aria-label='Number stepper'
    >
      <button
        type='button'
        className='ui-stepper__button'
        onClick={handleDecrease}
        disabled={!canDecrease}
        aria-label={decrementLabel}
        title={decrementLabel}
      >
        <Minus />
      </button>
      <span
        className={`ui-stepper__value ${valueClassName}`.trim()}
        aria-live='polite'
        aria-atomic='true'
      >
        {value}
      </span>
      <button
        type='button'
        className='ui-stepper__button'
        onClick={handleIncrease}
        disabled={!canIncrease}
        aria-label={incrementLabel}
        title={incrementLabel}
      >
        <Plus />
      </button>
    </div>
  );
}
