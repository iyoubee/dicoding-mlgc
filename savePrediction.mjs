import admin from 'firebase-admin'
import serviceAccount from './service.json' assert { type: 'json' };

// Inisialisasi Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://submissionmlgc-hilman-424200.firebaseio.com',
})

// Fungsi untuk menyimpan prediksi ke Firestore
async function savePredictionToFirestore(prediction) {
  try {
    const db = admin.firestore()

    // Tambahkan prediksi ke koleksi 'predictions'
    await db.collection('predictions').doc(prediction.id).set({
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
