const development = require('./dev')
const production = require('./production')

const config = {
  development,
  production,
}

let environmentName = process.env.NODE_ENV

if (!environmentName) {
  environmentName = 'development'
}

module.exports = config[environmentName]
