import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'vant/lib/index.css'
import '@vant/touch-emulator'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')