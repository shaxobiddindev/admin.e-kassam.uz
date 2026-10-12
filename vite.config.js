import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Xato hisobotidagi versiya (`lib/ek-errors.js`) — BUILD VAQTI: bu ilovaning
   `package.json` versiyasi o'zgarmaydi, deployni esa vaqt ajratadi. */
const BUILT = new Date().toISOString().slice(0, 16);
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  define: { __APP_VERSION__: JSON.stringify(BUILT) },
});
