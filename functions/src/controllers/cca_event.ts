import * as express from "express"
import {db} from "../index"
import {CCAEvent} from "../types/ccaEvent"
import {DocumentSnapshot} from "@google-cloud/firestore"

const cca_event = express()

const collection = "cca_events"

// Get list of events
cca_event.get("/event/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  // Get all events
  const events = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as CCAEvent[]
  // Check if events exist
  if (events.length === 0) {
    response.status(404).send({data: "No events found"})
  }
  // Return events to the client
  response.status(200).send({data: events})
})

// Get event by id
cca_event.get("/event/:id", async (request, response) => {
  const id = request.params.id as string
  // Get event by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<CCAEvent>
  const event = {_id: snapshot.id, ...snapshot.data()}
  // Check if event exists
  if (!event) {
    response.status(404).send({data: "No event found"})
  }
  // Send event to the client
  response.status(200).send({data: event})
})

// Create event
cca_event.post("/event/create", async (request, response) => {
  try {
    const body = request.body as CCAEvent
    // Add event to the database
    await db.collection(collection).add(body)
    response.status(201).send({
      data: "Event was created",
    })
  } catch (error) {
    response.status(500).send({data: "Event cannot be created"})
  }
})

// Update event
cca_event.patch("/event/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<CCAEvent>

  // Check if event exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No event found"})
  }

  // Update event
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "Event can not be updated"})
    })

  // Set updated event
  const updatedItem = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<CCAEvent>

  // Send updated event to the client
  response
    .status(200)
    .send({data: {_id: updatedItem.id, ...updatedItem.data()}})
})

// Delete event
cca_event.delete("/event/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if event exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No event found"})
    }
    // Delete event
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "Event was deleted"})
  } catch (error) {
    response.status(500).send({data: "Event cannot be deleted"})
  }
})

export default cca_event
