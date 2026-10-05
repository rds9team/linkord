/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        badgeDiscordAuthed: '#8b949e',
        badgeSupporter: '#3b82f6',
        badgeTeam: '#f5b942',
        badgeFounder: '#a855f7',
      }
    },
  },
  plugins: [],
}
