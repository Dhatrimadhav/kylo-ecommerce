import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        kylo: {
          black: '#0B0B0C',
          charcoal: '#1A1A1D',
          cream: '#F5F2EC',
          gold: '#C9A24B',
          line: '#E4E0D8'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)']
      }
    }
  },
  plugins: []
};
export default config;

