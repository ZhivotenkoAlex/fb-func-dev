import * as express from "express"
import {db} from "../index"
import {User} from "../types/user"
import {DocumentSnapshot} from "firebase-admin/firestore"

const users = express()

const collection = "users"

// Get list of users
users.get("/user/list", async (_request, response) => {
  const snapshot = await db.collection(collection).get()
  // Get all users
  const users = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data(),
  })) as User[]
  // Check if users exist
  if (users.length === 0) {
    response.status(404).send({data: "No users found"})
  }
  // Return users to the client
  response.status(200).send({data: users})
})

// Get user by id
users.get("/user/:id", async (request, response) => {
  const id = request.params.id
  // Get user by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<User>
  const user = snapshot.data()
  // Check if user exists
  if (!user) {
    response.status(404).send({data: "No users found"})
  }
  // Send user to the client
  response.status(200).send({data: {_id: snapshot.id, ...user}})
})

// Create user
users.post("/user/create", async (request, response) => {
  try {
    const body = request.body as User
    // Add user to the database
    await db.collection(collection).add(body)
    response.status(201).send({data: "User was created"})
  } catch (error) {
    response.status(500).send({data: "User cannot be created"})
  }
})

// Update user
users.patch("/user/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<User>

  // Check if user exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No users found"})
  }

  // Update user
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "User can not be updated"})
    })

  // Get updated user
  const updatedUser = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<User>

  // Send updated user to the client
  response
    .status(200)
    .send({data: {_id: updatedUser.id, ...updatedUser.data()}})
})

// Delete user
users.delete("/user/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if user exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No users found"})
    }
    // Delete user
    await db.collection(collection).doc(id).delete()
    response.status(204).send({data: "User was deleted"})
  } catch (error) {
    response.status(500).send({data: "User cannot be deleted"})
  }
})

export default users
