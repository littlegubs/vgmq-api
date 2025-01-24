import { Expose } from 'class-transformer'
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { Collection } from '../../games/entity/collection.entity'

export enum LobbyCollectionFilterType {
    Exclusion = 'exclusion',
    Limitation = 'limitation',
}

@Entity()
export class LobbyCollectionFilter {
    @PrimaryGeneratedColumn()
    @Expose({ groups: ['lobby'] })
    id: number

    @Column({
        type: 'enum',
        enum: LobbyCollectionFilterType,
        default: LobbyCollectionFilterType.Exclusion,
    })
    @Expose({ groups: ['lobby'] })
    type: LobbyCollectionFilterType

    @Column({ type: 'int' })
    @Expose({ groups: ['lobby'] })
    limitation: number

    @Expose({ groups: ['lobby'] })
    @ManyToOne(() => Collection, { eager: true })
    collection: Collection
}
