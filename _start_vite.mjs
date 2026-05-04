import('vite').then(({ createServer }) => {
  createServer({
    root: 'E:\\AI_Project\\企业管理系统\\frontend_vue3',
    configFile: 'E:\\AI_Project\\企业管理系统\\frontend_vue3\\vite.config.js',
    server: { port: 8080, host: true }
  }).then(server => {
    server.listen()
  })
})
