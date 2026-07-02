import React from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'white' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}) => {
  const reduce = useReducedMotion();
  const baseStyles = "relative inline-flex items-center justify-center rounded-md font-medium tracking-[0.01em] select-none transition-[background-color,border-color,color,box-shadow] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none will-change-transform";

  const variants = {
    primary: "bg-emerald-500 text-[#122019] border border-emerald-500 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_8px_-2px_rgba(16,185,129,0.45)] hover:bg-emerald-400 hover:border-emerald-400 hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_6px_18px_-4px_rgba(16,185,129,0.55)] active:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_1px_4px_-2px_rgba(16,185,129,0.4)]",
    secondary: "bg-muted text-foreground border border-border hover:bg-accent",
    outline: "border border-border text-foreground bg-background hover:bg-accent",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-accent",
    white: "bg-card text-card-foreground border border-border shadow-sm hover:bg-secondary hover:shadow-md",
    danger: "bg-red-500 text-white border border-red-600 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_2px_8px_-2px_rgba(220,38,38,0.4)] hover:bg-red-400 hover:border-red-500 hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_6px_18px_-4px_rgba(220,38,38,0.5)] active:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_1px_4px_-2px_rgba(220,38,38,0.4)]"
  };

  const sizes = {
    sm: "px-3.5 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <motion.button
      whileHover={reduce || disabled ? undefined : { y: -1 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.96, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.6 }}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};