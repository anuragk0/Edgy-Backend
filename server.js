require('dotenv').config();
const connectDB = require('./config/database')
const http = require('http')
const app = require('./src/app')

process.on('uncaughtException', (err) => {
  console.error(`Error: ${err}`)
  console.error('Process shut down due to Uncaught Exception error');
  server.close(() => {
    process.exit(1);
  })
})

const server = http.createServer(app);
const port = process.env.PORT || 8001;
console.log('Attempting to start server on port:', port);

const startServer = async () => {
  try {
    const message = await connectDB();
    console.log(message);
    server.listen(port, () => {
      console.log(`Server is connected on port ${port}`)
    })
  } catch (error) {
    console.error('Database connection error', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  console.error(err)
  console.error(`Process shut down due to Unhandled Rejection error`)
  server.close(() => {
    process.exit(1);
  })
})

startServer();
