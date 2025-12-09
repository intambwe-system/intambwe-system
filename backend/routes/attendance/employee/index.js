const router =  require('express').Router()

const employeeAuthRoute =  require('./employeeAuthRoute')
const employeeRoutes =  require('./employeeRoutes')

router.use('/auth',employeeAuthRoute)

router.use(employeeRoutes)

module.exports =  router