const mongoose = require('mongoose')
const Document = require('./Document')
const http = require('http')
const dotenv = require('dotenv')

dotenv.config()
mongoose.connect(process.env.MONGO_URL)

//3001 is port for server, 3000 is port for client
//origin is client address
//top part is server
const io = require('socket.io')(http.createServer().listen(3001), {
  cors: { origin: process.env.CLIENT_URL, methods: ['POST', 'GET'] },
})

const defaultValue = ''

io.on('connection', (socket) => {
  socket.on('get-document', async (documentId) => {
    const document = await findOrCreateDocument(documentId)
    socket.join(documentId)
    socket.emit('load-document', document.data)
    socket.on('send-changes', (delta) => {
      //broadcast except to us the event 'recieve-changes' with delta as parameter
      socket.broadcast.to(documentId).emit('recieve-changes', delta)
    })
    socket.on('save-document', async (data) => {
      await Document.findByIdAndUpdate(documentId, { data })
    })
  })
})

//if we dont have a doc create it or find the existing doc
async function findOrCreateDocument(id) {
  if (id == null) {
    return
  }
  const document = await Document.findById(id)
  if (document) {
    return document
  }
  return await Document.create({ _id: id, data: defaultValue })
}
