require('dotenv').config()
const app = require('./src/app')
const connectDB = require('./src/config/db')


connectDB()


app.listen(process.env.PORT || 6000,()=>{
     console.log(`http://localhost:${process.env.PORT}`)
})