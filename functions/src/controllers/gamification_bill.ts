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
    const billsWithProducts = []
    const billsSnapshot = await db
      .collection(collection)
      .limit(10)
      // .where("user_id", "==", _request.user?.user_id)
      .get()
    // Get all gamification bills

    for (const doc of billsSnapshot.docs) {
      const billData = doc.data()
      const date = timestampToDate(doc.data().date)
      const productsSnapshot = await doc.ref.collection("products").get()

      // Combine main document data with nested collection data
      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      billsWithProducts.push({...billData, date, products})
    }

    // Check if gamification bills exist
    if (billsWithProducts.length === 0) {
      response.status(404).send({data: "No gamification bill found"})
    }
    // Return gamification bills to the client
    response.status(200).send({data: billsWithProducts})
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
    const billsWithProducts = []
    for (const doc of querySnapshot.docs) {
      const billData = doc.data()
      const date = timestampToDate(doc.data().date)
      const productsSnapshot = await doc.ref.collection("products").get()

      // Combine main document data with nested collection data
      const products = productsSnapshot.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        }
      })
      billsWithProducts.push({
        _id: doc.id,
        status: doc.data().status,
        ...billData,
        date,
        products,
      })
    }

    // Get all Gamification

    // If no gamification bills are found, send a 404 response
    if (billsWithProducts.length === 0) {
      response.status(404).send({data: "No gamification bill found"})
    } else {
      // If gamification bills are found, send them in the response
      response.status(200).send({data: billsWithProducts})
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

  const billSnapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<GamificationBill>

  const data = billSnapshot.data()

  const productsSnapshot = await billSnapshot.ref.collection("products").get()
  const productsData = productsSnapshot.docs.map((productDoc) => ({
    id: productDoc.id,
    ...productDoc.data(),
  }))
  const billsWithProducts = {...data, products: productsData}

  const date = timestampToDate(billsWithProducts?.date as TimestampType)

  const gamification_bill: any = {
    _id: billSnapshot.id,
    ...billsWithProducts,
    // products,
    date,
  }

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
    const requestProducts = body.products ?? []
    delete body.products
    const billData = body
    try {
      const billRef = await db.collection(collection).add(billData)
      const gam_id = body?.gamification_id
      const productPromises = requestProducts.map((product) => {
        return billRef.collection("products").add(product)
      })
      await Promise.all(productPromises)

      response.status(201).send({
        data: `Gamification bill for gamification ${gam_id} was created`,
      })
    } catch (error) {
      console.log("🚀 ~ error:", error)
      response.status(500).send({data: "Gamification bill cannot be created"})
    }
  }
)

// Endpoint to update a gamification bill
gamification_bill.patch(
  "/gamification-bill/update/:billId",
  async (request, response) => {
    const billId = request.params.billId
    const snapshot = await db.collection(collection).doc(billId).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No gamification bill found"})
      return
    }

    const body = request.body as Partial<GamificationBill> & ProductString

    if (body.date !== undefined) {
      body.date = dateToTimestamp(body.date as Date)
    }

    if (body.time_added !== undefined) {
      body.time_added = dateToTimestamp(body.time_added as Date)
    }

    if (body.marked_by_user_to_recheck !== undefined) {
      // If 'marked_by_user_to_recheck' is true, convert it to a string "1"
      // If 'marked_by_user_to_recheck' is false, convert it to a string "0"
      body.marked_by_user_to_recheck =
        body.marked_by_user_to_recheck === "true" ? "1" : "0"
    }

    if (
      body.product_id !== undefined &&
      body.product_id !== "" &&
      body.product_id !== "null"
    ) {
      // Update the nested collection 'products' in the gamification bill collection
      const productStringPath = Object.keys(body).find((key) =>
        key.startsWith("nested_products")
      ) as string

      const fieldName = productStringPath.split(".")[1]
      const fieldValue = (body as IndexBody)[productStringPath]

      await db
        .collection(collection)
        .doc(billId)
        .collection("products")
        .doc(body.product_id)
        .update({[fieldName]: fieldValue})
        .catch(() => {
          response
            .status(500)
            .send({data: "gamification bill can not be updated"})
        })
    } else {
      // Update the gamification bill in the database
      delete body.product_id
      await db
        .collection(collection)
        .doc(billId)
        .update({...body})
        .catch(() => {
          response
            .status(500)
            .send({data: "gamification bill can not be updated"})
        })
    }

    // Fetch the updated gamification bill from the database
    const updatedBill = (await db
      .collection(collection)
      .doc(billId)
      .get()) as DocumentSnapshot<GamificationBill>

    const updatedBillData = updatedBill.data()

    const productsSnapshot = await updatedBill.ref.collection("products").get()
    const productsData = productsSnapshot.docs.map((productDoc) => ({
      id: productDoc.id,
      ...productDoc.data(),
    }))
    const updatedBillWithProducts = {
      ...updatedBillData,
      products: productsData,
    }

    // Convert the date and time_added from the updated bill to Date objects
    const date = timestampToDate(updatedBill.data()?.date as TimestampType)
    const time_added = timestampToDate(
      updatedBill.data()?.time_added as TimestampType
    )

    const gamification_bill = {
      _id: updatedBill.id,
      ...updatedBillWithProducts,
      date,
      time_added,
    }

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
    const productsSnapshot = doc.ref.collection("products").get() as any

    const products = productsSnapshot.docs.map((productDoc: any) => {
      const productData = productDoc.data()
      return {
        id: productDoc.id,
        ...productData,
      }
    })

    const date = timestampToDate(doc.data().date)
    const time_added = timestampToDate(doc.data().time_added)
    // const products = JSON.parse(doc.data().products_string)
    const resp = {
      _id: doc.id,
      ...doc.data(),
      products,
      date,
      time_added,
    } as GamificationBill

    // delete resp.products_string
    return resp
  })

  return gamificationBill
}

export default gamification_bill
