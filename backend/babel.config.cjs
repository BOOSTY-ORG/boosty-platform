module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: false
    }]
  ],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-runtime']
    }
  },
  // Transform ES modules to CommonJS for tests
  plugins: [
    '@babel/plugin-transform-modules-umd'
  ]
};