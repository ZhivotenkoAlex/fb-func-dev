import * as express from "express"
import {db} from "../index"
import {Gamification} from "../types/gamification"
import {DocumentSnapshot} from "firebase-admin/firestore"
import {dateToTimestamp} from "../helpers/timestampToDate"

const gamification = express()

const collection = "gamification"

// Get list of Gamification
gamification.get("/gamification/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  // Get all Gamification
  const gamification = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as Gamification[]
  // Check if Gamification exist
  if (gamification.length === 0) {
    response.status(404).send({data: "No gamification found"})
  }
  // Return Gamification to the client
  response.status(200).send({data: gamification})
})

// Get list of Gamification by company_id
gamification.get(
  "/gamification/list/:company_id",
  async (request, response) => {
    const snapshot = await db
      .collection(collection)
      .where("company_id", "==", request.params?.company_id)
      .get()
    // Get all Gamification
    const gamification = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as Gamification[]
    // Check if Gamification exist
    if (gamification.length === 0) {
      response.status(404).send({data: "No gamification found"})
    }
    // Return Gamification to the client
    response.status(200).send({data: gamification})
  }
)

// Get Gamification by id
gamification.get("/gamification/:id", async (request, response) => {
  const id = request.params.id
  // Get Gamification by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<Gamification>
  const gamification = {_id: snapshot.id, ...snapshot.data()}
  // Check if Gamification exists
  if (!gamification) {
    response.status(404).send({data: "No gamification found"})
  }
  // Send Gamification to the client
  response.status(200).send({data: gamification})
})

// Create Gamification
gamification.post("/gamification/create", async (request, response) => {
  const body = request.body as Gamification

  if (body.start !== undefined) {
    body.start = dateToTimestamp(body.start as Date)
  }

  if (body.finish !== undefined) {
    body.finish = dateToTimestamp(body.finish as Date)
  }

  if (body.show_after_registration_date !== undefined) {
    body.show_after_registration_date = dateToTimestamp(
      body.show_after_registration_date as Date
    )
  }

  try {
    // Add Gamification to the database
    await db.collection(collection).add(request.body)
    response.status(201).send({
      // data: `Gamification with ${body.companyId} was created`,
      data: "Gamification  was created",
    })
  } catch (error) {
    response.status(500).send({data: "Gamification cannot be created"})
  }
})

// Update Gamification
gamification.patch("/gamification/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<Gamification>

  // Check if Gamification exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No gamification found"})
  }

  // Update Gamification
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "Gamification can not be updated"})
    })

  // Set updated Gamification
  const updatedItem = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<Gamification>

  // Send updated Gamification to the client
  response.status(200).send({
    data: {_id: updatedItem.id, ...updatedItem.data()},
  })
})

// Delete Gamification
gamification.delete("/gamification/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if Gamification exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No gamification found"})
    }
    // Delete Gamification
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "Gamification was deleted"})
  } catch (error) {
    response.status(500).send({data: "Gamification cannot be deleted"})
  }
})

// Get Gamification by company_id
export const getGamificationByCompanyId = async (
  company_id: number | string
) => {
  const snapshot = await db
    .collection(collection)
    .where("company_id", "==", company_id)
    .get()
  // Get all Gamification
  const [gamification] = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as Gamification[]

  return gamification
}

export default gamification
