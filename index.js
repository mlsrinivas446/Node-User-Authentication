const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const dbPath = path.join(__dirname, 'users.db')
const app = express()
app.use(cors())
app.use(express.json())

let dbUsers = null

const initializeDBAndServer = async () => {
  try {
    dbUsers = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(-1)
  }
}
initializeDBAndServer()

//User Register API
app.post('/register', async (request, response) => {
  const {username, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(request.body.password, 10)

  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`
  const dbUser = await dbUsers.get(selectUserQuery)
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        users (username, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`
    await dbUsers.run(createUserQuery)
    response.send(`User created successfully`)
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//User Login API
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`
  const dbUser = await dbUsers.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        id: dbUsers.id,
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something went wrong!')
})
