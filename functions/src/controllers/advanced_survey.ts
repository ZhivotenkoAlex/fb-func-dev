import * as express from "express"
import {db} from "../index"
import {DocumentSnapshot} from "firebase-admin/firestore"
import {AdvancedSurvey} from "../types/advancedServey"

const advancedSurvey = express()

const collection = "advanced_survey"

// Get list of advanced surveys
advancedSurvey.get("/advanced-survey/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  // Get all advanced surveys
  const advanced_surveys = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as AdvancedSurvey[]
  // Check if advanced surveys exist
  if (advanced_surveys.length === 0) {
    response.status(404).send({data: "No advanced surveys found"})
  }
  // Return advanced surveys to the client
  response.status(200).send({data: advanced_surveys})
})

// Get advanced survey by id
advancedSurvey.get("/advanced-survey/:id", async (request, response) => {
  const id = request.params.id
  // Get advanced survey by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<AdvancedSurvey>
  const advanced_survey = snapshot.data()
  // Check if advanced survey exists
  if (!advanced_survey) {
    response.status(404).send({data: "No advanced survey found"})
  }
  // Send advanced survey to the client
  response.status(200).send({data: {_id: snapshot.id, ...advanced_survey}})
})

// Create advanced survey
advancedSurvey.post("/advanced-survey/create", async (request, response) => {
  try {
    const body = request.body as AdvancedSurvey
    // Add advanced_survey to the database
    await db.collection(collection).add(body)
    response.status(201).send({
      data: "Advanced survey was created",
    })
  } catch (error) {
    response.status(500).send({data: "Advanced survey cannot be created"})
  }
})

// Update advanced survey
advancedSurvey.patch(
  "/advanced-survey/update/:id",
  async (request, response) => {
    const id = request.params.id
    const body = request.body as Partial<AdvancedSurvey>

    // Check if advanced survey exists
    const snapshot = await db.collection(collection).doc(id).get()

    if (!snapshot.exists) {
      response.status(404).send({data: "No advanced survey found"})
    }

    // Update advanced survey
    await db
      .collection(collection)
      .doc(id)
      .update(body)
      .catch(() => {
        response
          .status(500)
          .send({data: "Advanced_survey can not be updated"})
      })

    // Set updated advanced survey
    const updatedItem = (await db
      .collection(collection)
      .doc(id)
      .get()) as DocumentSnapshot<AdvancedSurvey>

    // Send updated advanced survey to the client
    response
      .status(200)
      .send({data: {_id: updatedItem.id, ...updatedItem.data()}})
  }
)

// Delete advanced survey
advancedSurvey.delete(
  "/advanced-survey/delete/:id",
  async (request, response) => {
    try {
      const id = request.params.id
      // Check if advanced survey exists
      const snapshot = await db.collection(collection).doc(id).get()
      if (!snapshot.exists) {
        response.status(404).send({data: "No advanced survey found"})
      }
      // Delete advanced survey
      db.collection(collection).doc(id).delete()
      // Send response to the client
      response.status(204).send({data: "Advanced survey was deleted"})
    } catch (error) {
      response.status(500).send({data: "Advanced survey cannot be deleted"})
    }
  }
)

export default advancedSurvey
