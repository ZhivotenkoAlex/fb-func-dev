import * as express from "express"
import {db} from "../index"
import {DocumentSnapshot} from "firebase-admin/firestore"
import {AdvancedSurveyFillout} from "../types/advancedServeyFillout"

const advancedSurveyFillout = express()

const collection = "advanced_survey_fillout"

// Get list of fillouts
advancedSurveyFillout.get(
  "/survey-fillout/list",
  async (_request, response) => {
    const snapshot = await db.collection(collection).get()
    // Get all fillouts
    const fillouts = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as AdvancedSurveyFillout[]
    // Check if fillouts exist
    if (fillouts.length === 0) {
      response.status(404).send({data: "No fillouts found"})
    }
    // Return fillouts to the client
    response.status(200).send({data: fillouts})
  }
)

// Get fillout by id
advancedSurveyFillout.get("/survey-fillout/:id", async (request, response) => {
  const id = request.params.id
  // Get fillout by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<AdvancedSurveyFillout>
  const fillout = snapshot.data()
  // Check if fillout exists
  if (!fillout) {
    response.status(404).send({data: "No fillout found"})
  }
  // Send fillout to the client
  response.status(200).send({data: {_id: snapshot.id, ...fillout}})
})

// Create fillout
advancedSurveyFillout.post(
  "/survey-fillout/create",
  async (request, response) => {
    const body = request.body as AdvancedSurveyFillout
    try {
      // Add fillout to the database
      await db.collection(collection).add(body)
      response.status(201).send({
        data: "Fillout was created",
      })
    } catch (error) {
      response.status(500).send({data: "Fillout cannot be created"})
    }
  }
)

// Update fillout
advancedSurveyFillout.patch(
  "/survey-fillout/update/:id",
  async (request, response) => {
    const id = request.params.id
    const body = request.body as Partial<AdvancedSurveyFillout>

    // Check if fillout exists
    const snapshot = await db.collection(collection).doc(id).get()

    if (!snapshot.exists) {
      response.status(404).send({data: "No fillout found"})
    }

    // Update fillout
    await db
      .collection(collection)
      .doc(id)
      .update(body)
      .catch(() => {
        response.status(500).send({data: "Fillout can not be updated"})
      })

    // Set updated fillout
    const updatedItem = (await db
      .collection(collection)
      .doc(id)
      .get()) as DocumentSnapshot<AdvancedSurveyFillout>

    // Send updated fillout to the client
    response
      .status(200)
      .send({data: {_id: updatedItem.id, ...updatedItem.data()}})
  }
)

// Delete fillout
advancedSurveyFillout.delete(
  "/survey-fillout/delete/:id",
  async (request, response) => {
    try {
      const id = request.params.id
      // Check if fillout exists
      const snapshot = await db.collection(collection).doc(id).get()
      if (!snapshot.exists) {
        response.status(404).send({data: "No fillout found"})
      }
      // Delete fillout
      db.collection(collection).doc(id).delete()
      // Send response to the client
      response.status(204).send({data: "Fillout was deleted"})
    } catch (error) {
      response.status(500).send({data: "Fillout cannot be deleted"})
    }
  }
)

export default advancedSurveyFillout
