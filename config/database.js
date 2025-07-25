const mongoose = require('mongoose')

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.Database_URL);
    } catch (error) {
        console.error('Error connecting DataBase: ', error)
        process.exit(1);
    }
}

module.exports = connectDB;