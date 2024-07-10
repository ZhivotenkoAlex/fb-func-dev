import * as express from "express"
import {db} from "../index"
import {StatClicks} from "../types/stat_clicks"
import {DocumentSnapshot} from "firebase-admin/firestore"
import {DecodedIdToken} from "firebase-admin/auth"
import {dateToTimestamp} from "../helpers/timestampToDate"

const stat_clicks = express()

const collection = "stat_clicks"

// Get list of statistics for clicks
stat_clicks.get(
  "/stat-clicks/list",
  async (_request: express.Request & { user?: DecodedIdToken }, response) => {
    const snapshot = await db.collection(collection).get()
    // Get all statistic for clicks documents
    const stat_clicks = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as StatClicks[]
    // Check if statistic for clicks list is empty
    if (stat_clicks.length === 0) {
      response.status(404).send({data: "No statistic for clicks found"})
    }
    // Return statistic for clicks list to the client
    response.status(200).send({data: stat_clicks})
  }
)

// Get statistic for clicks by company id
stat_clicks.get("/stat-clicks/company", async (request, response) => {
  const {company_id, dateFrom, dateFor} = request.query

  const firstDate = dateFrom ?
    dateToTimestamp(new Date(dateFrom as string)) :
    await getFirstDate(company_id as string)

  if (!company_id) {
    response.status(400).send({data: "Company id is required"})
  }

  // Get statistic for clicks by id
  let query = db
    .collection(collection)
    .where("company_id", "==", company_id)
    .orderBy("stats_date", "asc")

  if (dateFrom) {
    query = query.startAt(firstDate)
  }

  if (dateFor) {
    const dateForTimestamp = dateToTimestamp(new Date(dateFor as string))
    query = query.endAt(dateForTimestamp)
  }

  const querySnapshot = await query.get()

  // Check if statistic for clicks exists

  const statistic = {
    company_id,
    pageview: 0,
    unique_pageview: 0,
    clicks_on_widget: 0,
    unique_clicks_on_widget: 0,
    totalRegistrations: 0,
  }

  querySnapshot.docs.forEach((doc) => {
    const data = doc.data()
    statistic.pageview += data.clicks_on_page
    statistic.clicks_on_widget += data.clicks_on_widget
    statistic.unique_pageview += data.unique_pageview
    statistic.unique_clicks_on_widget += data.unique_clicks_on_widget
    return
  })

  statistic.totalRegistrations = await amountOfNewRegistrationsPartners(
    company_id as string
  )

  // Send statistic for clicks to the client
  response.status(200).send({data: statistic})
})

// Get statistic for clicks by id
stat_clicks.get("/stat-clicks/id/:id", async (request, response) => {
  const id = request.params.id

  // Get statistic for clicks by id
  const snapshot = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<StatClicks>
  const statistic = snapshot.data() as Omit<StatClicks, "_id">
  // Check if statistic for clicks exists
  if (!statistic) {
    response.status(404).send({data: "No statistic for clicks found"})
  }
  // Send statistic for clicks to the client
  response.status(200).send({data: {_id: snapshot.id, ...statistic}})
})

// Create statistic for clicks
stat_clicks.post("/stat-clicks/create", async (request, response) => {
  try {
    const body = request.body as StatClicks
    // Add statistic for clicks to the database

    if (body.stats_date) {
      body.stats_date = dateToTimestamp(new Date(body.stats_date as string))
    }

    await db.collection(collection).add(body)
    response.status(201).send({data: "Statistic for clicks was created"})
  } catch (error) {
    response
      .status(500)
      .send({data: "Statistic for clicks cannot be created"})
  }
})

// Update statistic for clicks
stat_clicks.patch("/stat-clicks/update/:id", async (request, response) => {
  const id = request.params.id
  const body = request.body as Partial<StatClicks>

  if (body.stats_date) {
    body.stats_date = dateToTimestamp(new Date(body.stats_date as string))
  }

  // Check if statistic for clicks document exists
  const snapshot = await db.collection(collection).doc(id).get()

  if (!snapshot.exists) {
    response.status(404).send({data: "No statistic for clicks found"})
  }

  // Update statistic for clicks
  await db
    .collection(collection)
    .doc(id)
    .update(body)
    .catch(() => {
      response
        .status(500)
        .send({data: "Statistic for clicks can not be updated"})
    })

  // Get updated statistic for clicks
  const updatedStatistic = (await db
    .collection(collection)
    .doc(id)
    .get()) as DocumentSnapshot<StatClicks>

  // Send updated statistic for clicks to the client
  response
    .status(200)
    .send({data: {_id: updatedStatistic.id, ...updatedStatistic.data()}})
})

// Delete statistic for clicks
stat_clicks.delete("/stat-clicks/delete/:id", async (request, response) => {
  try {
    const id = request.params.id
    // Check if statistic for clicks exists
    const snapshot = await db.collection(collection).doc(id).get()
    if (!snapshot.exists) {
      response.status(404).send({data: "No statistic for clicks found"})
    }
    // Delete statistic for clicks
    db.collection(collection).doc(id).delete()
    // Send response to the client
    response.status(204).send({data: "Statistic for clicks was deleted"})
  } catch (error) {
    response
      .status(500)
      .send({data: "Statistic for clicks cannot be deleted"})
  }
})

const getFirstDate = async (companyId?: string) => {
  const query = db
    .collection(collection)
    .where("company_id", "==", companyId)
    .orderBy("stats_date", "asc")
    .limit(1)
  const snapshot = await query.get()
  let firstDate = null
  snapshot.forEach((doc) => {
    firstDate = doc.data().stats_date
  })
  if (firstDate !== null) {
    return firstDate
  } else {
    return dateToTimestamp(new Date())
  }
}

const amountOfNewRegistrationsPartners = async (companyId: string) => {
  const query = db.collection("fan").where("company_id", "==", companyId)

  const snapshot = await query.get()

  return snapshot.size
}

export default stat_clicks
