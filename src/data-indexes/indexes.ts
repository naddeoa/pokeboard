import fromPairs from 'ramda/es/fromPairs'
import unionWith from 'ramda/es/unionWith'
import { pokemon } from '../raw-data/pokemon'
import { pokemonTypes } from '../raw-data/pokemon-types'
import { swordShieldPokemonTypes } from '../raw-data/swordshield-pokemon-types'
import { swordShieldPokemon } from '../raw-data/sworshield-pokemon'
import { typeEfficacy } from '../raw-data/type-efficacy'
import { englishLocale, types } from '../raw-data/types'

const filtered = new Set(['???', 'shadow'])

export const typeNamesToId = types
    .filter(it => it.local_language_id === englishLocale && !filtered.has(it.name))
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
            acc[type_id] = name
            return acc
        },
        {} as Record<number, string>
    )

export interface TypeEfficacy {
    readonly type_id: number
    readonly damage_factor: number
}

export const typeIdsToEfficacies = typeEfficacy.reduce(
    (acc, curr) => {
        const [strengths, weaknesses] = acc
        // tslint:disable-next-line:no-magic-numbers
        if (curr.damage_factor > 100) {
            const strongTo = strengths[curr.damage_type_id] || []

            strongTo.push({
                damage_factor: curr.damage_factor,
                type_id: curr.target_type_id,
            })

            if (strengths[curr.damage_type_id] === undefined) {
                strengths[curr.damage_type_id] = strongTo
            }
        } else if (curr.damage_factor < 100) {
            const weakTo = weaknesses[curr.damage_type_id] || []

            weakTo.push({
                damage_factor: curr.damage_factor,
                type_id: curr.target_type_id,
            })

            if (weaknesses[curr.damage_type_id] === undefined) {
                weaknesses[curr.damage_type_id] = weakTo
            }
        }

        return acc
    },
    [{}, {}] as [Record<number, TypeEfficacy[]>, Record<number, TypeEfficacy[]>]
)

export const typeIdsToPositiveEfficacies = typeIdsToEfficacies[0]
export const typeIdsToNegativeEfficacies = typeIdsToEfficacies[1]

export const allTypeNames = Object.keys(typeNamesToId)

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
