// Function to fetch prediction histories from Firestore
export async function getPredictionHistories(req, res, admin) {
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
}
