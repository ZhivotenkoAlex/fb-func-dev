import * as express from "express"
import {db} from "../index"
import {GamificationBill, ProductString} from "../types/gamificationBill"
import {IndexType} from "../types/general_types"
import {
  CollectionReference,
  DocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore"
import {DecodedIdToken} from "firebase-admin/auth"
import {
  TimestampType,
  dateToTimestamp,
  timestampToDate,
} from "../helpers/timestampToDate"
import {Company} from "../types/company"
import {getGamificationByCompanyId} from "./gamification"
import {Gamification} from "../types/gamification"

type IndexBody = IndexType<Partial<GamificationBill> & ProductString>

const gamification_bill = express()

// const collection = "gamification_bills"
const collection = "gamificationBills"

// Get list of gamification bills
gamification_bill.get(
  "/gamification-bill/list",
  async (_request: express.Request & { user?: DecodedIdToken }, response) => {
    const snapshot = await db
      .collection(collection)
      // .where("user_id", "==", _request.user?.user_id)
      .get()
    // Get all gamification bills
    const gamification_bill = snapshot.docs.map((doc) => {
      const date = timestampToDate(doc.data().date)
      const products = JSON.parse(doc.data().products_string)
      const resp = {
        _id: doc.id,
        ...doc.data(),
        products,
        date,
      } as GamificationBill

      delete resp.products_string
      return resp
    })

    // Check if gamification bills exist
    if (gamification_bill.length === 0) {
      response.status(404).send({data: "No gamification bill found"})
    }
    // Return gamification bills to the client
    response.status(200).send({data: gamification_bill})
  }
)

// Get list of gamification bills
// Endpoint to get a paginated list of gamification bills
gamification_bill.get(
  "/gamification-bill/list/paginated",
  async (_request: express.Request & { user?: DecodedIdToken }, response) => {
    // Destructure the query parameters from the request
    const {
      companyId,
      lastId,
      firstId,
      toNext,
      transactionId,
      startDate,
      status,
      endDate,
      receiptNumber,
      isMarked,
    } = _request.query

    // Set the limit for the number of gamification bills to fetch
    const limit = 10

    const gamificationSnapshot = await db
      .collection("gamification")
      .where("company_id", "==", companyId)
      .get()

    const [gamification] = gamificationSnapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as Gamification[]

    // Initialize the query
    let query = db
      .collection(collection)
      .orderBy("id")
      .where("gamification_id", "==", gamification.id)

    // // Apply filters to the query if provided
    if (transactionId) query = query.where("id", "==", transactionId)
    if (startDate && startDate !== "null") {
      query = query.where(
        "date",
        ">=",
        Timestamp.fromDate(new Date(startDate as string))
      )
    }
    if (endDate && endDate !== "null") {
      query = query.where(
        "date",
        "<=",
        Timestamp.fromDate(new Date(endDate as string))
      )
    }
    if (receiptNumber) {
      query = query.where("number", "==", receiptNumber)
    }
    if (status && status !== "null" && status !== "") {
      query = query.where("status", "==", status)
    }
    if (isMarked && isMarked !== "null") {
      query = query.where(
        "marked_by_user_to_recheck",
        "==",
        isMarked === "true" ? "1" : "0"
      )
    }

    // Apply pagination to the query
    if (lastId != "null" && lastId !== "" && toNext == "null") {
      // initial query
      query = query.endAt([lastId]).limitToLast(limit)
    }

    if (toNext === "true" && lastId !== "" && lastId !== "null") {
      // Next button query
      query = query.startAfter(lastId).limit(limit)
    } else if (toNext === "false" && firstId !== "" && firstId !== "null") {
      // Previous button query
      query = query.endBefore(firstId).limitToLast(limit)
    }

    if ((lastId === "" || lastId === "null") && toNext == "null") {
      // Edit query
      query = query.limit(limit)
    }

    const querySnapshot = await query.get()

    // Get all Gamification

    // Filter the query results to an array of gamification bills
    const gamification_bill = querySnapshot.docs.map((doc) => {
      const date = timestampToDate(doc.data().date)
      const products = JSON.parse(doc.data().products_string)
      const resp = {
        _id: doc.id,
        status: doc.data().status,
        ...doc.data(),
        date,
        products,
      } as GamificationBill

      delete resp.products_string
      return resp
    })

    // If no gamification bills are found, send a 404 response
    if (gamification_bill.length === 0) {
      response.status(404).send({data: "No gamification bill found"})
    } else {
      // If gamification bills are found, send them in the response
      response.status(200).send({data: gamification_bill})
    }
  }
)

// Get filtered list of gamification bills
// Endpoint to get a filtered list of gamification bills
// based on the provided company ID and other filter items
gamification_bill.get(
  "/gamification-bill/filtered",
  async (request: express.Request & { user?: DecodedIdToken }, response) => {
    // Destructure the company ID and other filter items from the request query
    const {companyId, ...filterItems} = request.query as {
      companyId: string
      [key: string]: string
    }

    // Fetch the company data from the database using the provided company ID
    const companySnapshot = await db
      .collection("company")
      .doc(companyId as string)
      .get()

    // Extract the company data from the snapshot
    const companyData = companySnapshot.data() as DocumentSnapshot<Company>

    // If no company data is found, send a 404 response
    if (!companyData) {
      response.status(404).send({data: "No company found"})
      return
    }

    // Fetch the gamification data associated with the company
    const gamification = await getGamificationByCompanyId(companyData.id)

    // Fetch the gamification bills data associated with the gamification and apply the provided filters
    const gamification_bills = await getBillByGamificationId(
      gamification.id,
      filterItems
    )

    // If no gamification bills are found, send a 404 response
    if (gamification_bills.length === 0) {
      response.status(404).send({data: "No gamification bill found"})
      return
    }

    // If gamification bills are found, send them in the response
    response.status(200).send({data: gamification_bills})
  }
)

// Get gamification bill by id
gamification_bill.get("/gamification-bill/:id", async (request, response) => {
  const id = request.params.id
  // Get gamification bill by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<GamificationBill>
  const data = snapshot.data()
  const products = JSON.parse(data?.products_string as string)
  const date = timestampToDate(data?.date as TimestampType)

  const gamification_bill = {
    _id: snapshot.id,
    ...snapshot.data(),
    products,
    date,
  }
  delete gamification_bill.products_string

  // Check if gamification bill exists
  if (!gamification_bill) {
    response.status(404).send({data: "No gamification_bill found"})
  }
  // Send gamification bill to the client
  response.status(200).send({data: gamification_bill})
})

// Get gamification bill count by company id
gamification_bill.get("/gamification_bill/count", async (request, response) => {
  const companyId = request.query.companyId

  const gamificationSnapshot = db
    .collection("gamification")
    .where("company_id", "==", companyId)

  const gamification = await gamificationSnapshot.get()

  const gamificationId = gamification.docs[0].id

  const billQuery = db
    // .collection("gamification_bill")
    .collection("gamificationBills")
    .where("gamification_id", "==", gamificationId)

  const billsSnapShot = await billQuery.get()

  return response.status(200).send({data: billsSnapShot.size})
})

// Create gamification bill
gamification_bill.post(
  "/gamification-bill/create",
  async (request, response) => {
    const body = request.body as GamificationBill

    if (body.date !== undefined) {
      body.date = dateToTimestamp(body.date as Date)
    }

    if (body.time_added !== undefined) {
      body.time_added = dateToTimestamp(body.time_added as Date)
    }

    if (body.time_processed !== undefined) {
      body.time_processed = dateToTimestamp(body.time_processed as Date)
    }

    try {
      // Add gamification bill to the database
      await db.collection(collection).add(body)
      const gam_id = body?.gamification_id
      response.status(201).send({
        data: `Gamification bill for gamification ${gam_id} was created`,
      })
    } catch (error) {
      response.status(500).send({data: "Gamification bill cannot be created"})
    }
  }
)

// Endpoint to update a gamification bill
gamification_bill.patch(
  "/gamification-bill/update/:billId",
  async (request, response) => {
    // Extract the billId from the request parameters
    const billId = request.params.billId

    // Check if the gamification bill exists in the database
    const snapshot = await db.collection(collection).doc(billId).get()
    const bill = snapshot.data()
    // If the gamification bill does not exist, send a 404 response
    if (!snapshot.exists) {
      response.status(404).send({data: "No gamification bill found"})
      return
    }

    // Extract the body from the request and cast it to a Partial GamificationBill
    const body = request.body as Partial<GamificationBill> & ProductString

    // If a date is provided in the body, convert it to a timestamp
    if (body.date !== undefined) {
      body.date = dateToTimestamp(body.date as Date)
    }

    // If a time_added is provided in the body, convert it to a timestamp
    if (body.time_added !== undefined) {
      body.time_added = dateToTimestamp(body.time_added as Date)
    }

    // Check if 'marked_by_user_to_recheck' is provided in the request body
    if (body.marked_by_user_to_recheck !== undefined) {
      // If 'marked_by_user_to_recheck' is true, convert it to a string "1"
      // If 'marked_by_user_to_recheck' is false, convert it to a string "0"
      body.marked_by_user_to_recheck =
        body.marked_by_user_to_recheck === "true" ? "1" : "0"
    }

    const productList = JSON.parse(bill?.products_string as string)

    if (
      body.product_index !== undefined &&
      body.product_index !== "" &&
      body.product_index !== "null"
    ) {
      const productStringPath = Object.keys(body).find((key) =>
        key.startsWith("products_string")
      ) as string

      const fieldName = productStringPath.split(".")[1]

      productList[body.product_index][fieldName] = (body as IndexBody)[
        productStringPath
      ]

      delete (body as IndexBody)[productStringPath]
    }

    delete body.product_index

    // Update the gamification bill in the database
    await db
      .collection(collection)
      .doc(billId)
      .update({...body, products_string: JSON.stringify(productList)})
      .catch(() => {
        // If the update fails, send a 500 response
        response
          .status(500)
          .send({data: "gamification bill can not be updated"})
      })

    // Fetch the updated gamification bill from the database
    const updatedBill = (await db
      .collection(collection)
      .doc(billId)
      .get()) as DocumentSnapshot<GamificationBill>

    // Parse the products from the updated bill
    const products = JSON.parse(updatedBill.data()?.products_string as string)

    // Convert the date and time_added from the updated bill to Date objects
    const date = timestampToDate(updatedBill.data()?.date as TimestampType)
    const time_added = timestampToDate(
      updatedBill.data()?.time_added as TimestampType
    )

    // Construct the gamification bill to be sent in the response
    const gamification_bill = {
      _id: updatedBill.id,
      ...updatedBill.data(),
      products,
      date,
      time_added,
    }
    delete gamification_bill.products_string

    // Send the updated gamification bill in the response
    response.status(200).send({
      data: gamification_bill,
    })
  }
)

// Delete gamification bill
gamification_bill.delete(
  "/gamification-bill/delete/:billId",
  async (request, response) => {
    try {
      const billId = request.params.billId
      // Check if gamification bill exists
      const snapshot = await db.collection(collection).doc(billId).get()
      if (!snapshot.exists) {
        response.status(404).send({data: "No gamification bill found"})
      }
      // Delete gamification bill
      db.collection(collection).doc(billId).delete()
      // Send response to the client
      response.status(204).send({data: "Gamification bill was deleted"})
    } catch (error) {
      response.status(500).send({data: "Gamification bill cannot be deleted"})
    }
  }
)

/**
 * This function fetches gamification bills by gamification id and applies additional filters if provided.
 * @param gamification_id - The id of the gamification.
 * @param filters - An object containing additional filters for the query.
 * @returns An array of gamification bills.
 */

export const getBillByGamificationId = async (
  gamification_id: number | string,
  filters: { [key: string]: string } = {}
) => {
  const {transactionId, startDate, endDate, receiptNumber, status, isMarked} =
    filters

  // Start with a query for gamification bills with the provided gamification id
  let query = db
    .collection(collection)
    .where("gamification_id", "==", gamification_id)

  // Apply additional filters if provided
  if (transactionId) {
    query = query.where("id", "==", transactionId)
  }

  // If a startDate is provided, filter the companies that were created on or after this date
  if (startDate && startDate !== "null") {
    const start = Timestamp.fromDate(new Date(startDate as string))
    query = query.where(
      "date",
      ">=",
      start
    ) as CollectionReference<FirebaseFirestore.DocumentData>
  }

  // If an endDate is provided, filter the companies that were created on or before this date
  if (endDate && endDate !== "null") {
    const end = Timestamp.fromDate(new Date(endDate as string))
    query = query.where(
      "date",
      "<=",
      end
    ) as CollectionReference<FirebaseFirestore.DocumentData>
  }

  if (receiptNumber) {
    query = query.where("number", "==", receiptNumber)
  }

  if (status && status !== "null") {
    query = query.where("status", "==", status)
  }

  if (isMarked && isMarked !== "null") {
    const isMarkedBool = isMarked === "true" ? "1" : "0"
    query = query.where("marked_by_user_to_recheck", "==", isMarkedBool)
  }

  // Execute the query
  const filteredBills = await query.get()

  // Map the results to an array of gamification bills
  const gamificationBill = filteredBills.docs.map((doc) => {
    const date = timestampToDate(doc.data().date)
    const time_added = timestampToDate(doc.data().time_added)
    const products = JSON.parse(doc.data().products_string)
    const resp = {
      _id: doc.id,
      ...doc.data(),
      products,
      date,
      time_added,
    } as GamificationBill

    delete resp.products_string
    return resp
  })

  return gamificationBill
}

export default gamification_bill
