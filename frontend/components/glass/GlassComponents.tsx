'use client'

import React, { forwardRef, ReactNode } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { clsx } from 'clsx'

// Base glass component with motion support
interface GlassBaseProps extends MotionProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'premium' | 'subtle' | 'dark'
  blur?: 'sm' | 'md' | 'lg' | 'xl'
  glow?: boolean
  interactive?: boolean
}

const GlassBase = forwardRef<HTMLDivElement, GlassBaseProps>(({
  children,
  className,
  variant = 'default',
  blur = 'md',
  glow = false,
  interactive = false,
  ...motionProps
}, ref) => {
  const baseClasses = 'relative border backdrop-blur-xl'
  
  const variantClasses = {
    default: 'bg-white/10 border-white/20',
    premium: 'bg-gradient-to-br from-white/15 to-white/5 border-white/25 shadow-glass',
    subtle: 'bg-white/5 border-white/10',
    dark: 'bg-black/20 border-white/10',
  }
  
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md', 
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  }
  
  const interactiveClasses = interactive 
    ? 'transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-glow-primary cursor-pointer'
    : ''
    
  const glowClasses = glow ? 'shadow-glow-primary' : ''
  
  return (
    <motion.div
      ref={ref}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        blurClasses[blur],
        interactiveClasses,
        glowClasses,
        className
      )}
      whileHover={interactive ? { y: -2, scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      {...motionProps}
    >
      {children}
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none bg-noise rounded-[inherit]" />
      
      {/* Inner highlight */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
    </motion.div>
  )
})

GlassBase.displayName = 'GlassBase'

// Glass Card Component
interface GlassCardProps extends GlassBaseProps {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  className,
  padding = 'md',
  children,
  ...props
}, ref) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  }
  
  return (
    <GlassBase
      ref={ref}
      className={clsx('rounded-3xl', paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </GlassBase>
  )
})

GlassCard.displayName = 'GlassCard'

// Glass Panel Component
interface GlassPanelProps extends GlassBaseProps {
  header?: ReactNode
  footer?: ReactNode
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(({
  className,
  children,
  header,
  footer,
  ...props
}, ref) => {
  return (
    <GlassBase
      ref={ref}
      className={clsx('rounded-2xl overflow-hidden', className)}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-white/10 bg-white/5">
          {header}
        </div>
      )}
      
      <div className="p-6">
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-4 border-t border-white/10 bg-white/5">
          {footer}
        </div>
      )}
    </GlassBase>
  )
})

GlassPanel.displayName = 'GlassPanel'

// Glass Button Component
interface GlassButtonProps extends Omit<MotionProps, 'onClick'> {
  children: ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(({
  children,
  className,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  ...motionProps
}, ref) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-medium rounded-xl backdrop-blur-md transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    default: 'bg-white/10 border-white/20 text-base-50 hover:bg-white/20 focus:ring-white/30',
    primary: 'bg-accent-primary-600/20 border-accent-primary-400/30 text-accent-primary-100 hover:bg-accent-primary-500/30 focus:ring-accent-primary-400/50',
    secondary: 'bg-accent-purple-600/20 border-accent-purple-400/30 text-accent-purple-100 hover:bg-accent-purple-500/30 focus:ring-accent-purple-400/50',
    success: 'bg-emerald-600/20 border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/30 focus:ring-emerald-400/50',
    danger: 'bg-red-600/20 border-red-400/30 text-red-100 hover:bg-red-500/30 focus:ring-red-400/50',
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }
  
  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...motionProps}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <span className={loading ? 'invisible' : 'visible'}>
        {children}
      </span>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -top-px overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      </div>
    </motion.button>
  )
})

GlassButton.displayName = 'GlassButton'

// Glass Input Component
interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled'
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(({
  className,
  label,
  error,
  size = 'md',
  variant = 'default',
  ...props
}, ref) => {
  const baseClasses = 'w-full bg-white/5 border rounded-xl backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent placeholder:text-base-400'
  
  const variantClasses = {
    default: 'border-white/20 focus:border-accent-primary-400/50 focus:bg-white/10 focus:ring-accent-primary-400/30',
    filled: 'border-transparent bg-white/10 focus:bg-white/15 focus:ring-accent-primary-400/30',
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  }
  
  const errorClasses = error 
    ? 'border-red-400/50 focus:border-red-400 focus:ring-red-400/30' 
    : ''
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-base-200">
          {label}
        </label>
      )}
      
      <input
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          errorClasses,
          className
        )}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
})

GlassInput.displayName = 'GlassInput'

// Glass Modal Component
interface GlassModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function GlassModal({ isOpen, onClose, children, title, size = 'md' }: GlassModalProps) {
  if (!isOpen) return null
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={clsx('relative w-full', sizeClasses[size])}
      >
        <GlassCard variant="premium" className="w-full">
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-display-lg text-gradient-premium">
                {title}
              </h2>
              <GlassButton
                variant="default"
                size="sm"
                onClick={onClose}
                className="!p-2"
              >
                ✕
              </GlassButton>
            </div>
          )}
          
          {children}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

// Glass Badge Component
interface GlassBadgeProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

export function GlassBadge({ 
  children, 
  className, 
  variant = 'default',
  size = 'sm' 
}: GlassBadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium backdrop-blur-md border rounded-full'
  
  const variantClasses = {
    default: 'bg-white/10 border-white/20 text-base-200',
    primary: 'bg-accent-primary-600/20 border-accent-primary-400/30 text-accent-primary-200',
    success: 'bg-emerald-600/20 border-emerald-400/30 text-emerald-200',
    warning: 'bg-amber-600/20 border-amber-400/30 text-amber-200',
    danger: 'bg-red-600/20 border-red-400/30 text-red-200',
  }
  
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }
  
  return (
    <span className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </span>
  )
}

// Export all components
export { GlassBase }

// Animation presets for glass components
// Enhanced animation presets for glass components
export const glassAnimations = {
  slideIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  },
  slideInUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  },
  slideInLeft: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  },
  slideInRight: {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  },
  bounce: {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: 20 },
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1],
      scale: { type: 'spring', damping: 15, stiffness: 300 }
    }
  },
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
}