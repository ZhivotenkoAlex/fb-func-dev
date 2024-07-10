import * as express from "express"
import {db} from "../index"
import {ExternalFillout} from "../types/externalFillout"
import {DocumentSnapshot} from "@google-cloud/firestore"

const external_fillout = express()

const collection = "external_fillout"

// Get list of external fillouts
external_fillout.get("/external-fillout/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  const external_fillout_list = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as ExternalFillout[]
  if (external_fillout_list.length === 0) {
    response.status(404).send({data: "No external fillout found"})
  }
  response.status(200).send({data: external_fillout_list})
})

// Get external fillout by id
external_fillout.get("/external-fillout/:id", async (request, response) => {
  const id = request.params.id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<ExternalFillout>
  const external_fillout = {
    _id: snapshot.id,
    ...snapshot.data(),
  }
  if (!external_fillout) {
    response.status(404).send({data: "No external fillout found"})
  }
  response.status(200).send({data: external_fillout})
})

// Create external fillout
external_fillout.post("/external-fillout/create", async (request, response) => {
  const body = request.body as ExternalFillout
  try {
    await db.collection(collection).add(request.body)
    response.status(201).send({
      data: `External fillout for company ${body?.company_id} was created`,
    })
  } catch (error) {
    response.status(500).send({data: "External fillout cannot be created"})
  }
})

// Update external fillout
external_fillout.patch(
  "/external-fillout/update/:filloutId",
  async (request, response) => {
    const filloutId = request.params.filloutId
    const body = request.body as Partial<ExternalFillout>
    const snapshot = await db.collection(collection).doc(filloutId).get()

    if (!snapshot.exists) {
      response.status(404).send({data: "No external fillout found"})
    }

    await db
      .collection(collection)
      .doc(filloutId)
      .update(body)
      .catch(() => {
        response
          .status(500)
          .send({data: "External fillout can not be updated"})
      })

    const updatedFillout = (await db
      .collection(collection)
      .doc(filloutId)
      .get()) as DocumentSnapshot<ExternalFillout>

    response.status(200).send({
      data: {
        _id: updatedFillout.id,
        ...updatedFillout.data(),
      },
    })
  }
)

// Delete external fillout
external_fillout.delete(
  "/external-fillout/delete/:id",
  async (request, response) => {
    try {
      const filloutId = request.params.id
      const snapshot = await db.collection(collection).doc(filloutId).get()
      if (!snapshot.exists) {
        response.status(404).send({data: "No external fillout found"})
      }
      db.collection(collection).doc(filloutId).delete()
      response.status(204).send({data: "External fillout was deleted"})
    } catch (error) {
      response.status(500).send({data: "External fillout cannot be deleted"})
    }
  }
)

export const getExternalFilloutByCompanyId = async (
  company_id: number | string
) => {
  const snapshot = await db
    .collection(collection)
    .where("companyId", "==", company_id)
    .get()
  // Get all Gamification
  const externalFillout = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as ExternalFillout[]

  return externalFillout
}

export default external_fillout
