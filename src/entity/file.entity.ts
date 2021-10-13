import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class File {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    path: string

    @Column()
    originalFilename: string

    @Column()
    mimeType: string

    @Column({ type: 'decimal' })
    size: number
}
