import * as express from "express"
import {db} from "../index"
import {Category} from "../types/category"
import {DocumentSnapshot} from "@google-cloud/firestore"

const category = express()

const collection = "categories"

// Get list of categories
category.get("/category/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  // Get all categories
  const categories = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as Category[]
  // Check if categories exist
  if (categories.length === 0) {
    response.status(404).send({data: "No categories found"})
  }
  // Return categories to the client
  response.status(200).send({data: categories})
})

// Get category by id
category.get("/category/:id", async (request, response) => {
  const id = request.params.id
  // Get category by id
  const snapshot = await db.collection(collection).doc(id).get()
  const category = {_id: snapshot.id, ...snapshot.data()} as Category
  // Check if category exists
  if (!category) {
    response.status(404).send({data: "No category found"})
  }
  // Send category to the client
  response.status(200).send({data: category})
})

// Create category
category.post("/category/create", async (request, response) => {
  try {
    const body = request.body as Category
    // Add category to the database
    await db.collection(collection).add(body)
    response.status(201).send({
      data: "Category was created",
    })
  } catch (error) {
    response.status(500).send({data: "Category cannot be created"})
  }
})

// Update category
category.patch("/category/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<Category>

  // Check if category exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No category found"})
  }

  // Update category
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "Category can not be updated"})
    })

  // Set updated category
  const updatedItem = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<Category>

  // Send updated category to the client
  response
    .status(200)
    .send({data: {_id: updatedItem.id, ...updatedItem.data()}})
})

// Delete category
category.delete("/category/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if category exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No category found"})
    }
    // Delete category
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "Category was deleted"})
  } catch (error) {
    response.status(500).send({data: "Category cannot be deleted"})
  }
})

export default category
