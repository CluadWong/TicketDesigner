import { createApp } from "vue";
import App from "./App.vue";
import "@/styles/root.css";

// G8 独立运行入口：消费页演示。开发期 `vite` 后访问 /preview.html 即可。
// 设计器本身仍由根 index.html → /src/main.ts 挂载，二者互不影响。
createApp(App).mount("#app");
