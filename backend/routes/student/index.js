const router = require('express').Router()
const studentRoutes = require('../student/studentRoutes')
const studentAuthRoutes = require('../student/studentAuthRoute')

router.use('/auth',studentAuthRoutes)
router.use(studentRoutes)

module.exports = studentRoutes