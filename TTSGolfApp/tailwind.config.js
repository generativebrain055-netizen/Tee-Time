/**
 * Tailwind / NativeWind Configuration
 *
 * RULES:
 * - Every value here MUST derive from ui/theme/tokens.ts.
 * - Arbitrary values (e.g. `bg-[#5EBC68]`) are FORBIDDEN.
 * - If a value doesn't exist here, add a token first, then reference it.
 * - dark: variants are powered by the `class` strategy.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  content: [
    './App.{js,jsx,ts,tsx}',
    './ui/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './utils/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // -----------------------------------------------------------------
      // COLORS — from tokens palette + semantic
      // -----------------------------------------------------------------
      colors: {
        primary: {
          DEFAULT: '#5EBC68',
          dark: '#4BA85A',
          light: '#D1FAE5',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#5EBC68',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#059669',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark: '#2563EB',
        },
        text: {
          primary: '#1C1C1E',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          inverse: '#FFFFFF',
        },
        bg: {
          DEFAULT: '#F8F9FA',
          card: '#FFFFFF',
          muted: '#F9FAFB',
          elevated: '#FFFFFF',
          dark: '#121212',
          'dark-card': '#1E1E1E',
          'dark-muted': '#2A2A2A',
          'dark-elevated': '#2D2D2D',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
          dark: '#374151',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5F5',
          tertiary: '#E8E8E8',
        },
      },

      // -----------------------------------------------------------------
      // FONT FAMILY
      // -----------------------------------------------------------------
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        'sans-extrabold': ['Inter_800ExtraBold'],
        'sans-black': ['Inter_900Black'],
        // PlusJakartaSans
        jakarta: ['PlusJakartaSans_400Regular'],
        'jakarta-medium': ['PlusJakartaSans_500Medium'],
        'jakarta-semibold': ['PlusJakartaSans_600SemiBold'],
        'jakarta-bold': ['PlusJakartaSans_700Bold'],
        'jakarta-extrabold': ['PlusJakartaSans_800ExtraBold'],
      },

      // -----------------------------------------------------------------
      // FONT SIZE — from tokens.fontSize
      // -----------------------------------------------------------------
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '48px' }],
      },

      // -----------------------------------------------------------------
      // SPACING — 4px base grid from tokens.spacing
      // -----------------------------------------------------------------
      spacing: {
        '2xs': '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
        '6xl': '64px',
        '7xl': '80px',
      },

      // -----------------------------------------------------------------
      // BORDER RADIUS — from tokens.radii
      // -----------------------------------------------------------------
      borderRadius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },

      // -----------------------------------------------------------------
      // BOX SHADOW
      // -----------------------------------------------------------------
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        primary: '0 4px 14px 0 rgba(94, 188, 104, 0.4)',
      },

      // -----------------------------------------------------------------
      // OPACITY — semantic aliases
      // -----------------------------------------------------------------
      opacity: {
        disabled: '0.5',
        pressed: '0.9',
        hover: '0.8',
      },

      // -----------------------------------------------------------------
      // MIN HEIGHT / WIDTH — accessibility touch targets
      // -----------------------------------------------------------------
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
