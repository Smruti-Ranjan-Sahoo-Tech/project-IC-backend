const mongoose = require('mongoose')

const adminAcessRequestScheema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    cource: {
        type: String,
        required: true
    }
})

const AdminAcessRequestModel=mongoose.model("AdminAcessRequest",adminAcessRequestScheema)

module.exports=AdminAcessRequestModel