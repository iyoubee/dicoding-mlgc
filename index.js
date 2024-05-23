const express = require('express')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const tf = require('@tensorflow/tfjs-node')
const { Storage } = require('@google-cloud/storage')
const path = require('path')
const os = require('os')
const fs = require('fs')

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
const bucketName = 'YOUR_BUCKET_NAME' // Replace with your bucket name
const modelPath = './'

let model

// Function to download and load the model
async function loadModel() {
  const tempDir = os.tmpdir()
  const modelDir = path.join(tempDir, uuidv4())
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
      await storage
        .bucket(bucketName)
        .file(`${path.dirname(modelPath)}/${file}`)
        .download(options)
    })
  )

  model = await tf.loadLayersModel(
    `file://${path.join(modelDir, 'model.json')}`
  )
}

// Load the model when the server starts
loadModel()
  .then(() => {
    console.log('Model loaded successfully')
  })
  .catch((err) => {
    console.error('Failed to load model', err)
  })

// Endpoint to handle prediction
app.post('/predict', upload.single('image'), async (req, res) => {
  try {
    if (!model) {
      throw new Error('Model is not loaded')
    }

    // Simulate image preprocessing and prediction
    // This is a placeholder - replace with actual image processing logic
    const imageBuffer = req.file.buffer
    const imageTensor = tf.node
      .decodeImage(imageBuffer)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .expandDims()

    const prediction = model.predict(imageTensor)
    const result =
      (await prediction.array())[0][0] > 0.5 ? 'Cancer' : 'Non-cancer'

    const predictionResult = {
      status: 'success',
      message: 'Model is predicted successfully',
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
      message: 'Terjadi kesalahan dalam melakukan prediksi',
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
    message: err.message || 'Terjadi kesalahan dalam melakukan prediksi',
  })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
