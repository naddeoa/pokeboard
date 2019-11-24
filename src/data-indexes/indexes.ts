import fromPairs from 'ramda/es/fromPairs'
import toPairs from 'ramda/es/toPairs'
import unionWith from 'ramda/es/unionWith'
import { pokemon } from '../raw-data/pokemon'
import { pokemonTypes } from '../raw-data/pokemon-types'
import { swordShieldPokemonTypes } from '../raw-data/swordshield-pokemon-types'
import { swordShieldPokemon } from '../raw-data/sworshield-pokemon'
import { typeEfficacy } from '../raw-data/type-efficacy'
import { englishLocale, types } from '../raw-data/types'

export const typeNamesToId = types
    .filter(it => it.local_language_id === englishLocale)
    .reduce(
        (acc, { name, type_id }) => {
            acc[name.toLowerCase()] = type_id
            return acc
        },
        {} as Record<string, number>
    )

export const typeIdsToNames = types
    .filter(it => it.local_language_id === englishLocale)
    .reduce(
        (acc, { name, type_id }) => {
            acc[type_id] = name.toLowerCase()
            return acc
        },
        {} as Record<number, string>
    )

export interface TypeEfficacy {
    readonly type_id: number
    readonly damage_factor: number
}

export interface Efficacy {
    [typeName: string]: number
}

export interface OffenseDefense {
    offense: Efficacy
    defense: Efficacy
}

export interface TypeEfficacies {
    [typeName: string]: OffenseDefense
}

export const allTypeNames = Object.keys(typeNamesToId)

function emptyEfficacy(): Efficacy {
    return fromPairs(allTypeNames.map(typeName => [typeName, 1]))
}

export function combineEfficacies(e1: Efficacy, e2: Efficacy): Efficacy {
    return fromPairs(
        toPairs(e1).map(([typeName, factor]) => {
            return [typeName, factor * e2[typeName]]
        })
    )
}

export function combineOffenseDefense(o1: OffenseDefense, o2: OffenseDefense): OffenseDefense {
    return {
        offense: combineEfficacies(o1.offense, o2.offense),
        defense: combineEfficacies(o1.defense, o2.defense),
    }
}

export const offenseDefenseEfficacies = typeEfficacy.reduce(
    (acc, curr) => {
        const damageTypeName = typeIdsToNames[curr.damage_type_id]
        const targetTypeName = typeIdsToNames[curr.target_type_id]

        const damageEfficacy = acc[damageTypeName] || (acc[damageTypeName] = { offense: emptyEfficacy(), defense: emptyEfficacy() })
        damageEfficacy.offense[targetTypeName] = curr.damage_factor / 100

        const targetEfficacy = acc[targetTypeName] || (acc[targetTypeName] = { offense: emptyEfficacy(), defense: emptyEfficacy() })
        targetEfficacy.defense[damageTypeName] = curr.damage_factor / 100

        return acc
    },
    {} as TypeEfficacies
)

const mergedPokemonDataSets = unionWith((a, b) => a.id === b.id, pokemon, swordShieldPokemon)
export const pokemonNamesToIds = fromPairs(mergedPokemonDataSets.map(it => [it.identifier, it.id] as [string, number]))

export interface PokemonType {
    readonly type_id: number
    readonly slot: 'primary' | 'secondary'
}

const mergedPokemonTypeData = unionWith(
    (a, b) => a.pokemon_id === b.pokemon_id && a.slot === b.slot && a.type_id === b.type_id,
    pokemonTypes,
    swordShieldPokemonTypes
)
export const pokemonIdsToTypes = mergedPokemonTypeData.reduce(
    (acc, curr) => {
        const typesForPkm = acc[curr.pokemon_id] || []
        typesForPkm.push({ type_id: curr.type_id, slot: curr.slot === 1 ? 'primary' : 'secondary' })
        if (acc[curr.pokemon_id] === undefined) {
            acc[curr.pokemon_id] = typesForPkm
        }
        return acc
    },
    {} as Record<number, PokemonType[]>
)

export const allPokemonNames = Object.keys(pokemonNamesToIds)

export interface AllTypesAndPokemon {
    readonly type: 'pokemon' | 'type'
    readonly name: string
}
export const allPokemonAndTypeNames: AllTypesAndPokemon[] = [
    ...allPokemonNames.map(it => ({ type: 'pokemon', name: it } as const)),
    ...allTypeNames.map(it => ({ type: 'type', name: it } as const)),
]
