import {TimestampType} from "../helpers/timestampToDate"

export interface StatClicks {
  _id: string
  stats_date?: Date | TimestampType | null | string
  company_id: string
  clicks_on_page: number
  clicks_on_widget: number
  unique_clicks_on_page: number
  unique_clicks_on_widget: number
  pageview: number
  unique_pageview: number
  visitor_id: string
}
