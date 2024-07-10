export interface GuestUser {
  _id: string
  id: number
  hash: string
  userId: number | null
  currentProfileId: string
  allProfileIds: string | null
}
