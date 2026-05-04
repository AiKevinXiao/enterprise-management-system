import('vite').then(({ createServer }) => {
  createServer({
    root: '.',
    configFile: './vite.config.js',
    server: { port: 8080, host: true }
  }).then(server => {
    server.listen()
  })
})
