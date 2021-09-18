export type IgdbGame = {
    id: number
    alternative_names?: {
        id: number
        name: string
    }[]
    category: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
    cover?: {
        id: number
        image_id: string
    }
    first_release_date?: number
    parent_game?: {
        id: number
        url: string
    }
    name: string
    url: string
    slug: string
    version_parent?: {
        id: number
        url: string
    }
}