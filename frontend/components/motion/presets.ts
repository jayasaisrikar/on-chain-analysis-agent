// Advanced motion presets for framer-motion animations
// Optimized for crypto dashboard UI with smooth, professional animations

export const easings = {
  // Custom bezier curves for different animation feels
  smooth: [0.16, 1, 0.3, 1],
  snappy: [0.25, 0.46, 0.45, 0.94],
  bouncy: [0.68, -0.55, 0.265, 1.55],
  gentle: [0.25, 0.1, 0.25, 1],
  sharp: [0.4, 0, 0.2, 1],
}

export const durations = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  slower: 0.8,
}

// Page transitions
export const pageTransitions = {
  slideUp: {
    initial: { 
      opacity: 0, 
      y: 20,
      filter: 'blur(4px)'
    },
    animate: { 
      opacity: 1, 
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: durations.slow,
        ease: easings.smooth
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      filter: 'blur(4px)',
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  },
  
  slideLeft: {
    initial: { 
      opacity: 0, 
      x: 30,
      filter: 'blur(2px)'
    },
    animate: { 
      opacity: 1, 
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: durations.normal,
        ease: easings.smooth
      }
    },
    exit: { 
      opacity: 0, 
      x: -30,
      filter: 'blur(2px)',
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  },

  scale: {
    initial: { 
      opacity: 0, 
      scale: 0.95,
      filter: 'blur(4px)'
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: durations.normal,
        ease: easings.smooth
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.05,
      filter: 'blur(4px)',
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  }
}

// Component-specific animations
export const componentAnimations = {
  // Cards and panels
  card: {
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        duration: durations.fast,
        ease: easings.gentle
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
        ease: easings.sharp
      }
    }
  },

  // Buttons
  button: {
    hover: {
      scale: 1.05,
      transition: {
        duration: durations.fast,
        ease: easings.gentle
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.1,
        ease: easings.sharp
      }
    }
  },

  // Icons
  icon: {
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: {
        duration: durations.fast,
        ease: easings.bouncy
      }
    }
  },

  // Loading states
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: easings.gentle
      }
    }
  },

  spin: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  },

  // Text animations
  typewriter: (text: string, delay = 0) => ({
    initial: { width: '0%' },
    animate: { 
      width: '100%',
      transition: {
        duration: text.length * 0.05,
        delay,
        ease: 'linear'
      }
    }
  }),

  fadeInWords: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: durations.normal,
      ease: easings.smooth
    }
  }
}

// Stagger animations
export const staggerAnimations = {
  container: (delayChildren = 0.1) => ({
    animate: {
      transition: {
        staggerChildren: delayChildren,
        delayChildren: 0.2
      }
    }
  }),

  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.smooth
      }
    }
  },

  // For grid layouts
  grid: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.05,
          delayChildren: 0.1
        }
      }
    },
    item: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { 
        opacity: 1, 
        scale: 1,
        transition: {
          duration: durations.normal,
          ease: easings.smooth
        }
      }
    }
  },

  // For list items
  list: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.15
        }
      }
    },
    item: {
      initial: { opacity: 0, x: -20 },
      animate: { 
        opacity: 1, 
        x: 0,
        transition: {
          duration: durations.normal,
          ease: easings.smooth
        }
      }
    }
  }
}

// Modal and overlay animations
export const modalAnimations = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: durations.fast,
        ease: easings.gentle
      }
    },
    exit: { 
      opacity: 0,
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  },

  modal: {
    initial: { 
      opacity: 0, 
      scale: 0.9,
      y: 20
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.smooth
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: 20,
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  },

  slideDown: {
    initial: { 
      opacity: 0, 
      y: -20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: durations.normal,
        ease: easings.smooth
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      scale: 0.95,
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  }
}

// Notification animations
export const notificationAnimations = {
  slideInRight: {
    initial: { 
      opacity: 0, 
      x: '100%',
      scale: 0.9
    },
    animate: { 
      opacity: 1, 
      x: '0%',
      scale: 1,
      transition: {
        duration: durations.normal,
        ease: easings.smooth
      }
    },
    exit: { 
      opacity: 0, 
      x: '100%',
      scale: 0.9,
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  },

  bounce: {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.8
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: durations.slow,
        ease: easings.bouncy
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      scale: 0.8,
      transition: {
        duration: durations.fast,
        ease: easings.sharp
      }
    }
  }
}

// Utility animations
export const utilityAnimations = {
  // Glow effect for interactive elements
  glow: {
    animate: {
      boxShadow: [
        '0 0 20px rgba(59, 130, 246, 0.4)',
        '0 0 40px rgba(59, 130, 246, 0.6)',
        '0 0 20px rgba(59, 130, 246, 0.4)'
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: easings.gentle
      }
    }
  },

  // Floating animation
  float: {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: easings.gentle
      }
    }
  },

  // Shimmer loading effect
  shimmer: {
    animate: {
      x: ['-100%', '100%'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  },

  // Attention-grabbing animation
  attention: {
    animate: {
      scale: [1, 1.05, 1, 1.05, 1],
      transition: {
        duration: 1,
        ease: easings.gentle
      }
    }
  }
}

// Layout transition helpers
export const layoutTransitions = {
  // For responsive layout changes
  responsive: {
    layout: true,
    transition: {
      duration: durations.normal,
      ease: easings.smooth
    }
  },

  // For reordering lists
  reorder: {
    layout: true,
    transition: {
      duration: durations.fast,
      ease: easings.sharp
    }
  }
}

// Export commonly used presets
export const commonPresets = {
  fadeInUp: pageTransitions.slideUp,
  slideIn: pageTransitions.slideLeft,
  scaleIn: pageTransitions.scale,
  cardHover: componentAnimations.card.hover,
  buttonHover: componentAnimations.button.hover,
  stagger: staggerAnimations.container(),
  modalEnter: modalAnimations.modal,
  notifySlide: notificationAnimations.slideInRight
}