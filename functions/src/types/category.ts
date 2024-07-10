export interface Category {
  _id: string
  company_id: string
  is_slave: boolean
  master_id: number
  name: string
  parent_id: number
  priority: number
}
