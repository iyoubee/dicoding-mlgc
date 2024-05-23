import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import * as tf from '@tensorflow/tfjs-node'
import dotenv from 'dotenv'
import { savePredictionToFirestore } from './savePrediction.mjs'
import admin from 'firebase-admin'
import serviceAccount from './service.json' assert { type: 'json' }

dotenv.config()
const app = express()
const port = process.env.PORT || 8080

// Inisialisasi Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DB_URL,
})

const db = admin.firestore()

// Configure multer for file upload
const upload = multer({
  limits: { fileSize: 1000000 }, // Limit file size to 1MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'))
    }
    cb(null, true)
  },
}).single('image')

let model

// Function to download and load the model
async function loadModel() {
  try {
    const modelUrl = process.env.MODEL_URL
    if (!modelUrl) {
      throw new Error('Model URL is not provided in the environment variable')
    }
    model = await tf.loadGraphModel(modelUrl)
    console.log('Model loaded successfully')
  } catch (err) {
    console.error('Failed to load model', err)
  }
}

// Load the model when the server starts
loadModel()

app.use(cors())

// Endpoint to handle prediction
app.post('/predict', (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      // Handle Multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 'fail',
          message:
            'Payload content length greater than maximum allowed: 1000000',
        })
      }
      return res.status(400).json({
        status: 'fail',
        message: 'Error during file upload',
      })
    }

    try {
      if (!model) {
        throw new Error('Model is not loaded')
      }

      // Simulate image preprocessing and prediction
      const imageBuffer = req.file.buffer
      const imageTensor = tf.node
        .decodeImage(imageBuffer)
        .resizeBilinear([224, 224])
        .toFloat()
        .expandDims()

      const prediction = model.predict(imageTensor)
      const result =
        (await prediction.array())[0][0] > 0.5 ? 'Cancer' : 'Non-cancer'

      const predictionData = {
        id: uuidv4(),
        result,
        suggestion:
          result === 'Cancer'
            ? 'Segera periksa ke dokter!'
            : 'Tetap jaga kesehatan!',
        createdAt: new Date().toISOString(),
      }

      // Save prediction to Firestore
      await savePredictionToFirestore(predictionData, db)

      const predictionResult = {
        status: 'success',
        message: 'Model is predicted successfully',
        data: {
          ...predictionData,
        },
      }

      res.status(201).json(predictionResult)
    } catch (error) {
      res.status(400).json({
        status: 'fail',
        message: 'Terjadi kesalahan dalam melakukan prediksi',
      })
    }
  })
})

// Check if server is running
app.get('/', (req, res) => {
  res.send('Server is running!')
})

// New endpoint to get prediction histories
app.get('/predict/histories', async (req, res) => {
  try {
    const snapshot = await db.collection('predictions').get()
    const histories = snapshot.docs.map((doc) => ({
      id: doc.id,
      history: doc.data(),
    }))

    res.status(200).json({
      status: 'success',
      data: histories,
    })
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: 'Error fetching prediction histories: ' + error.message,
    })
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
