/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: 'var(--glass-bg)',
        glassb: 'var(--glass-border)',
        fg: 'var(--text)',
        dim: 'var(--dim)',
        faint: 'var(--faint)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
      },
    },
  },
  plugins: [],
}
