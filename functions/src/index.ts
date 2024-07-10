import * as functions from "firebase-functions"
import * as express from "express"
import * as admin from "firebase-admin"
import * as cors from "cors"
import {getFirestore} from "firebase-admin/firestore"
import users from "./controllers/user"
import guest_user from "./controllers/guest_user"
import gamification_bill from "./controllers/gamification_bill"
import gamification from "./controllers/gamification"
import external_fillout from "./controllers/external_fillout"
import company from "./controllers/company"
import cca_event from "./controllers/cca_event"
import category from "./controllers/category"
import advancedSurveyFillout from "./controllers/advanced_survey_fillout"
import additionalPointsTypes from "./controllers/additional_points_types"
import advancedSurvey from "./controllers/advanced_survey"
import stat_clicks from "./controllers/stat_clicks"
import validateFirebaseIdToken from "./middleware/validateToken"

admin.initializeApp(functions.config().firebase)

export const dbInstance = getFirestore(admin.app(), "test-development")
// const dbInstance = getFirestore(admin.app())
dbInstance.settings({ignoreUndefinedProperties: true})
export const db = dbInstance
const app = express()

app.use(cors())
app.use(validateFirebaseIdToken)

app.use(
  "/",
  additionalPointsTypes,
  advancedSurveyFillout,
  advancedSurvey,
  category,
  cca_event,
  company,
  external_fillout,
  gamification_bill,
  gamification,
  guest_user,
  users,
  stat_clicks
)

exports.app = functions.https.onRequest(app)
