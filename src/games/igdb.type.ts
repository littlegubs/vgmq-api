export type IgdbGame = {
    id: string
    alternative_names?: {
        id: number
        name: string
    }[]
    category: number
    cover?: {
        id: number
        image_id: string
    }
    first_release_date?: Date
    parent_game?: number
    name: string
    url: string
    version_parent?: number
}
