// index.mjs

import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import * as tf from '@tensorflow/tfjs-node'
import { Storage } from '@google-cloud/storage'
import path from 'path'
import os from 'os'
import fs from 'fs'

const app = express()
const port = process.env.PORT || 8080

// Configure multer for file upload
const upload = multer({
  limits: { fileSize: 1000000 }, // Limit file size to 1MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'))
    }
    cb(null, true)
  },
})

// Initialize Google Cloud Storage
const storage = new Storage()
const bucketName = 'submissionmlgc-hilman'

let model

// Function to download and load the model
async function loadModel() {
  try {
    const tempDir = './model/'
    const modelDir = path.join(tempDir)
    if (fs.existsSync(modelDir)) {
      fs.rmdirSync(modelDir, { recursive: true })
    }
    fs.mkdirSync(modelDir)

    const files = [
      'model.json',
      'group1-shard1of4.bin',
      'group1-shard2of4.bin',
      'group1-shard3of4.bin',
      'group1-shard4of4.bin',
    ]

    await Promise.all(
      files.map(async (file) => {
        const options = {
          destination: path.join(modelDir, file),
        }
        await storage.bucket(bucketName).file(file).download(options)
      })
    )
    
    model = await tf.loadGraphModel(`file://${modelDir}/model.json`);;
    console.log('Model loaded successfully')
  } catch (err) {
    console.error('Failed to load model', err)
  }
}

// Load the model when the server starts
loadModel()

// Endpoint to handle prediction
app.post('/predict', upload.single('image'), async (req, res) => {
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

    const predictionResult = {
      status: 'success',
      message: 'Model prediction successful',
      data: {
        id: uuidv4(),
        result,
        suggestion:
          result === 'Cancer'
            ? 'Segera periksa ke dokter!'
            : 'Tetap jaga kesehatan!',
        createdAt: new Date().toISOString(),
      },
    }

    res.status(200).json(predictionResult)
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: 'Error during prediction: ' + error.message,
    })
  }
})

// Handle errors related to file size and type
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      status: 'fail',
      message: 'Payload content length greater than maximum allowed: 1000000',
    })
  }

  res.status(400).json({
    status: 'fail',
    message: err.message || 'Error during prediction',
  })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
