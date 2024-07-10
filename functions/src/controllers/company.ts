import * as express from "express"
import {db} from "../index"
import {Company} from "../types/company"

import {getGamificationByCompanyId} from "./gamification"
import {getBillByGamificationId} from "./gamification_bill"
// import { getExternalFilloutByCompanyId } from "./external_fillout"
import {
  CollectionReference,
  // , Timestamp
} from "firebase-admin/firestore"
import {dateToTimestamp} from "../helpers/timestampToDate"
// import { GamificationBill } from "../types/gamificationBill"

const company = express()

const collection = "company"

// Endpoint to get a list of companies
company.get("/company/list", async (request, response) => {
  // Extract query parameters from the request
  const {companyName, profileId, startDate, endDate} = request.query

  // Reference to the company collection in the database
  const companyCollection = db.collection(collection)

  // Initialize the query
  let query = companyCollection

  // If a company name is provided, filter by company name
  if (companyName && companyName !== "null" && companyName !== "") {
    query = query.where(
      "name",
      "==",
      companyName
    ) as CollectionReference<FirebaseFirestore.DocumentData>
  }

  // If a profileId is provided, filter the companies by profileId
  if (profileId && profileId !== "") {
    query = query.where(
      "id",
      "==",
      profileId
    ) as CollectionReference<FirebaseFirestore.DocumentData>
  }

  // If a startDate is provided, filter the companies that were created on or after this date
  if (startDate && startDate !== "null" && startDate !== "") {
    // const start = Timestamp.fromDate(new Date(startDate as string))
    const start = new Date(startDate as string).toISOString()
    query = query.where(
      "created_time",
      ">=",
      start
    ) as CollectionReference<FirebaseFirestore.DocumentData>
  }

  // If an endDate is provided, filter the companies that were created on or before this date
  if (endDate && endDate !== "null" && endDate !== "") {
    // const end = Timestamp.fromDate(new Date(endDate as string))
    const end = new Date(endDate as string).toISOString()
    query = query.where(
      "created_time",
      "<=",
      end
    ) as CollectionReference<FirebaseFirestore.DocumentData>
  }

  // Execute the query
  const companies = await query.get().then((res) =>
    res.docs.map((doc) => ({
      // Extract the company data from the document
      _id: doc.id,
      ...doc.data(),
    }))
  )

  // If no companies were found, send a 404 response
  if (companies.length === 0) {
    response.status(404).send({data: "No companies found"})
  }

  // Send the list of companies to the client
  response.status(200).send({data: companies})
})

// Endpoint to get a list of companies
company.get("/company/paginated", async (request, response) => {
  // Extract query parameters from the request

  try {
    const {
      companyName,
      profileId,
      startDate,
      endDate,
      lastId,
      firstId,
      toNext,
    } = request.query

    const limit = 10

    // Initialize the query
    let query = db.collection(collection).orderBy("id", "asc")

    // If a company name is provided, filter by company name
    if (companyName && companyName !== "null" && companyName !== "") {
      query = query.where(
        "name",
        "==",
        companyName
      ) as CollectionReference<FirebaseFirestore.DocumentData>
    }

    // If a profileId is provided, filter the companies by profileId
    if (profileId && profileId !== "" && profileId !== "null") {
      query = query.where(
        "id",
        "==",
        profileId
      ) as CollectionReference<FirebaseFirestore.DocumentData>
    }

    // If a startDate is provided, filter the companies that were created on or after this date
    if (startDate && startDate !== "null" && startDate !== "") {
      // const start = Timestamp.fromDate(new Date(startDate as string))
      const start = new Date(startDate as string).toISOString()
      query = query.where(
        "created_time",
        ">=",
        start
      ) as CollectionReference<FirebaseFirestore.DocumentData>
    }

    // If an endDate is provided, filter the companies that were created on or before this date
    if (endDate && endDate !== "null" && endDate !== "") {
      // const end = Timestamp.fromDate(new Date(endDate as string))
      const end = new Date(endDate as string).toISOString()
      query = query.where(
        "created_time",
        "<=",
        end
      ) as CollectionReference<FirebaseFirestore.DocumentData>
    }

    // Apply pagination to the query
    if (toNext == "null") {
      // Initial and filter query
      query = query.limit(
        limit
      ) as CollectionReference<FirebaseFirestore.DocumentData>
    }

    if (toNext === "true" && lastId !== "" && lastId !== "null") {
      // Next button query
      query = query
        .startAfter(lastId)
        .limit(limit) as CollectionReference<FirebaseFirestore.DocumentData>
    } else if (toNext === "false" && firstId !== "" && firstId !== "null") {
      // Previous button query
      query = query
        .endBefore(firstId)
        .limitToLast(
          limit
        ) as CollectionReference<FirebaseFirestore.DocumentData>
    }

    // Execute the query
    const companies = await query.get().then((res) =>
      res.docs.map((doc) => ({
        // Extract the company data from the document
        _id: doc.id,
        ...doc.data(),
      }))
    )

    // If no companies were found, throw an error
    if (companies.length === 0) {
      response.status(404).send({data: "No companies found"})
    } else {
      response.status(200).send({data: companies})
    }

    // Send the list of companies to the client
  } catch (error: unknown) {
    // If no companies were found, send a 404 response
    if (error instanceof Error) {
      response.status(500).send({data: error.message})
    } else {
      response.status(500).send({data: "A server error occurred"})
    }
  }
})

company.get("/company/nameList", async (request, response) => {
  // Reference to the company collection in the database
  const query = db.collection(collection)

  // Execute the query
  const companyNames = await query.get().then((res) =>
    res.docs.map((doc) => ({
      // Extract the company data from the document
      _id: doc.id,
      name: doc.data().name,
    }))
  )

  // If no companies were found, send a 404 response
  if (companyNames.length === 0) {
    response.status(404).send({data: "No companies found"})
  }

  // Send the list of companies to the client
  response.status(200).send({data: companyNames})
})

// Get company by id
company.get("/company/:id", async (request, response) => {
  const id = request.params.id
  const companyData = await getCompanyCollection(id)
  // Check if company exists
  if (!companyData) {
    response.status(404).send({data: "No company found"})
  }
  // Send company and gamification data to the client
  response.status(200).send({data: companyData})
})

// Create company
company.post("/company/create", async (request, response) => {
  try {
    const body = request.body as Company
    // Add company to the database

    if (body.created_time !== undefined) {
      body.created_time = dateToTimestamp(body.created_time as Date)
    }

    if (body.made_full_time !== undefined) {
      body.made_full_time = dateToTimestamp(body.made_full_time as Date)
    }

    if (body.modified_time !== undefined) {
      body.modified_time = dateToTimestamp(body.modified_time as Date)
    }

    await db.collection(collection).add(body)

    const res = await db
      .collection(collection)
      .where("id", "==", body.id)
      .get()
      .then((res) => res.docs[0].id)

    response.status(201).send({
      data: {id: res},
    })
  } catch (error) {
    response.status(500).send({data: "Company cannot be created"})
  }
})

// Update company
company.patch("/company/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body

  // Check if company exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No company found"})
  }

  if (body.created_time !== undefined) {
    body.created_time = dateToTimestamp(body.created_time as Date)
  }

  if (body.created_time !== undefined) {
    body.created_time = dateToTimestamp(body.created_time as Date)
  }

  // Update company
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response.status(500).send({data: "Company can not be updated"})
    })

  // Get updated company
  const updatedItem = await getCompanyCollection(id)

  // Send updated company to the client
  response.status(200).send({data: {updatedItem}})
})

// Delete company
company.delete("/company/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if company exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No company found"})
    }
    // Delete company
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "Company was deleted"})
  } catch (error) {
    response.status(500).send({data: "Company cannot be deleted"})
  }
})

// This function retrieves a company's data from the database using its ID
export const getCompanyCollection = async (companyId: string) => {
  // Fetch the company document from the database
  const doc = await db.collection(collection).doc(companyId).get()
  // Extract the company data from the document
  const company = {_id: doc.id, ...doc.data()} as Company
  // Extract the company ID from the company data
  const company_id = company && company.id
  // Fetch the gamification data associated with the company
  let gamification = null
  if (company_id) {
    gamification = await getGamificationByCompanyId(company_id)
  }
  // Fetch the external fillout data associated with the company
  // const externalFillout = await getExternalFilloutByCompanyId(company_id)
  // Fetch the gamification bills data associated with the gamification
  let bills = null
  if (gamification && "id" in gamification) {
    bills = await getBillByGamificationId(gamification.id)
  }

  // Return the company data, including the external fillout data and the updated gamification data
  return {
    ...company,
    // external_fillout_list: externalFillout,
    gamification: {
      ...gamification,
      gamification_bills: bills,
    },
  }
}

export default company
