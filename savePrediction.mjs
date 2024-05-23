async function savePredictionToFirestore(prediction, db) {
  try {
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
