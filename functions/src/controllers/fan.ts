import * as express from "express"
import {db} from "../index"
import {DocumentSnapshot} from "firebase-admin/firestore"
import {DecodedIdToken} from "firebase-admin/auth"
import {dateToTimestamp} from "../helpers/timestampToDate"
import {Fan} from "../types/fan"

const fan = express()

const collection = "fan"

// Get list of fans
fan.get(
  "/fan/list",
  async (_request: express.Request & { user?: DecodedIdToken }, response) => {
    const snapshot = await db.collection(collection).get()
    // Get all fans documents
    const fans = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as Fan[]
    // Check fan list is empty
    if (fans.length === 0) {
      response.status(404).send({data: "No fan found"})
    }
    // Return fan list to the client
    response.status(200).send({data: fans})
  }
)

// Get fan by id
fan.get("/fan/:id", async (request, response) => {
  const id = request.params.id

  // Get fan by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<Fan>
  const fan = snapshot.data() as Omit<Fan, "_id">
  // Check if fan exists
  if (!fan) {
    response.status(404).send({data: "No fan found"})
  }
  // Send fan document to the client
  response.status(200).send({data: {_id: snapshot.id, ...fan}})
})

// Create fan
fan.post("/fan/create", async (request, response) => {
  try {
    const body = request.body as Fan

    // Add fan to the database
    if (body.time) {
      body.time = dateToTimestamp(new Date(body.time as string))
    }
    if (body.time_backup) {
      body.time_backup = dateToTimestamp(new Date(body.time_backup as string))
    }
    if (body.newsletter_time) {
      body.newsletter_time = dateToTimestamp(
        new Date(body.newsletter_time as string)
      )
    }
    if (body.last_sent_inactivity_sms) {
      body.last_sent_inactivity_sms = dateToTimestamp(
        new Date(body.last_sent_inactivity_sms as string)
      )
    }
    if (body.blocked_at) {
      body.blocked_at = dateToTimestamp(new Date(body.blocked_at as string))
    }
    if (body.archived_at) {
      body.archived_at = dateToTimestamp(new Date(body.archived_at as string))
    }

    await db.collection(collection).add(body)
    response.status(201).send({data: "Fan was created"})
  } catch (error) {
    response.status(500).send({data: "Fan cannot be created"})
  }
})

// Update fan
fan.patch("/fan/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<Fan>

  if (body.time) {
    body.time = dateToTimestamp(new Date(body.time as string))
  }
  if (body.time_backup) {
    body.time_backup = dateToTimestamp(new Date(body.time_backup as string))
  }
  if (body.newsletter_time) {
    body.newsletter_time = dateToTimestamp(
      new Date(body.newsletter_time as string)
    )
  }
  if (body.last_sent_inactivity_sms) {
    body.last_sent_inactivity_sms = dateToTimestamp(
      new Date(body.last_sent_inactivity_sms as string)
    )
  }
  if (body.blocked_at) {
    body.blocked_at = dateToTimestamp(new Date(body.blocked_at as string))
  }
  if (body.archived_at) {
    body.archived_at = dateToTimestamp(new Date(body.archived_at as string))
  }

  // Check if fan document exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No fan found"})
  }

  // Update fan
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "Fan can not be updated"})
    })

  // Get updated fan document
  const updatedFan = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<Fan>

  // Send updated fan document to the client
  response
    .status(200)
    .send({data: {_id: updatedFan.id, ...updatedFan.data()}})
})

// Delete fan
fan.delete("/fan/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if fan exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No fan found"})
    }
    // Delete fan document
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "Fan was deleted"})
  } catch (error) {
    response.status(500).send({data: "Fan cannot be deleted"})
  }
})

export default fan
