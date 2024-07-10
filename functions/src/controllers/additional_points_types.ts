import * as express from "express"
import {db} from "../index"
import {AdditionalPointsTypes} from "../types/additionPointsType"
import {DocumentSnapshot} from "firebase-admin/firestore"

const additionalPointsTypes = express()

const collection = "additional_points_types"

// Get list of additional points types
additionalPointsTypes.get("/points-types/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  // Get all additional points types
  const additionalPointsTypes = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AdditionalPointsTypes[]
  // Check if additional points types exist
  if (additionalPointsTypes.length === 0) {
    response.status(404).send({data: "No additional points types found"})
  }
  // Return additional points types to the client
  response.status(200).send({data: additionalPointsTypes})
})

// Get additional points type by id
additionalPointsTypes.get("/points-types/:id", async (request, response) => {
  const {id} = request.params
  // Get additional points type by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<AdditionalPointsTypes>
  const additionalPointsType = snapshot.data()
  // Check if additional points type exists
  if (!additionalPointsType) {
    response.status(404).send({data: "No additional points type found"})
  }
  // Send additional points type to the client
  response
    .status(200)
    .send({data: {id: snapshot.id, ...additionalPointsType}})
})

// Create additional points type
additionalPointsTypes.post(
  "/points-types/create",
  async (request, response) => {
    const body = request.body as AdditionalPointsTypes
    try {
      // Add additional points type to the database
      await db.collection(collection).add(body)
      response.status(201).send({
        data: "Additional points type ${type.id} was created",
      })
    } catch (error) {
      response
        .status(500)
        .send({data: "Additional points type cannot be created"})
    }
  }
)

// Update additional points type
additionalPointsTypes.patch(
  "/points-types/update/:id",
  async (request, response) => {
    const {id} = request.params
    const body = request.body as Partial<AdditionalPointsTypes>
    // Check if additional points type exists
    const snapshot = await db.collection(collection).doc(id).get()

    if (!snapshot.exists) {
      response.status(404).send({data: "No additional points type found"})
    }

    // Update additional points type
    await db
      .collection(collection)
      .doc(id)
      .update(body)
      .catch(() => {
        response
          .status(500)
          .send({data: "Additional points type can not be updated"})
      })

    // Set updated additional points type
    const updatedItem = (await db
      .collection(collection)
      .doc(id)
      .get()) as DocumentSnapshot<AdditionalPointsTypes>

    // Send updated additional points type to the client
    response
      .status(200)
      .send({data: {id: updatedItem.id, ...updatedItem.data()}})
  }
)

// Delete additional points type
additionalPointsTypes.delete(
  "/points-types/delete/:id",
  async (request, response) => {
    try {
      const id = request.params.id
      // Check if additional points type exists
      const snapshot = await db.collection(collection).doc(id).get()
      if (!snapshot.exists) {
        response.status(404).send({data: "No additional points type found"})
      }
      // Delete additional points type
      db.collection(collection).doc(id).delete()
      // Send response to the client
      response.status(204).send({data: "Additional points type was deleted"})
    } catch (error) {
      response
        .status(500)
        .send({data: "Additional points type cannot be deleted"})
    }
  }
)

export default additionalPointsTypes
