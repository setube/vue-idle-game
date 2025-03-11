import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
// 导入Vant组件
import 'vant/lib/index.css'
import '@vant/touch-emulator'

// 创建应用实例
const app = createApp(App)

// 使用插件
app.use(createPinia())
app.use(router)

// 挂载应用
app.mount('#app')
