import * as express from "express"
import {db} from "../index"
import {GuestUser} from "../types/guest_user"
import {DocumentSnapshot} from "firebase-admin/firestore"
import {DecodedIdToken} from "firebase-admin/auth"

const guest_user = express()

const collection = "guest_user"

// Get list of guest users
guest_user.get(
  "/guest-user/list",
  async (_request: express.Request & { user?: DecodedIdToken }, response) => {
    const snapshot = await db
      .collection(collection)
      // .where("user_id", "==", _request.user?.user_id)
      .get()
    // Get all guest user
    const guest_users_list = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as GuestUser[]
    // Check if guest user exist
    if (guest_user.length === 0) {
      response.status(404).send({data: "No guest guest user found"})
    }
    // Return guest user to the client
    response.status(200).send({data: guest_users_list})
  }
)

// Get guest user by id
guest_user.get("/guest-user/:id", async (request, response) => {
  const id = request.params.id
  // Get user by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<GuestUser>
  const user = snapshot.data() as Omit<GuestUser, "_id">
  // Check if user exists
  if (!user) {
    response.status(404).send({data: "No guest guest_user found"})
  }
  // Send user to the client
  response.status(200).send({data: {_id: snapshot.id, ...user}})
})

// Create user
guest_user.post("/guest-user/create", async (request, response) => {
  try {
    const body = request.body as GuestUser
    // Add user to the database
    await db.collection(collection).add(body)
    response.status(201).send({data: "Guest user was created"})
  } catch (error) {
    response.status(500).send({data: "User cannot be created"})
  }
})

// Update user
guest_user.patch("/guest-user/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<GuestUser>

  // Check if guest user exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No guest user found"})
  }

  // Update guest user
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "Guest user can not be updated"})
    })

  // Get updated guest user
  const updatedUser = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<GuestUser>

  // Send updated guest user to the client
  response
    .status(200)
    .send({data: {_id: updatedUser.id, ...updatedUser.data()}})
})

// Delete user
guest_user.delete("/guest-user/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if guest user exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No guest user found"})
    }
    // Delete guest user
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "User was deleted"})
  } catch (error) {
    response.status(500).send({data: "User cannot be deleted"})
  }
})

export default guest_user
