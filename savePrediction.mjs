import { Firestore } from '@google-cloud/firestore'
import serviceAccount from './service.json' assert { type: 'json' }

// Initialize Firestore client with service account credentials
const firestore = new Firestore({
  projectId: serviceAccount.project_id,
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
})

// Function to save prediction to Firestore
async function savePredictionToFirestore(prediction) {
  try {
    // Add prediction to the 'predictions' collection
    await firestore.collection('predictions').doc(prediction.id).set({
      id: prediction.id,
      result: prediction.result,
      suggestion: prediction.suggestion,
      createdAt: prediction.createdAt,
    })

    console.log('Prediction saved to Firestore:', prediction.id)
  } catch (error) {
    console.error('Error saving prediction to Firestore:', error)
  }
}

export { savePredictionToFirestore }
