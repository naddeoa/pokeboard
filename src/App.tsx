import find from 'ramda/es/find'
import flatten from 'ramda/es/flatten'
import startsWith from 'ramda/es/startsWith'
import toPairs from 'ramda/es/toPairs'
import React, { useEffect, useState } from 'react'
import { Highlighter, Typeahead, TypeaheadMenuProps, TypeaheadResult } from 'react-bootstrap-typeahead'
import './app.css'
import { Card } from './card/Card'
import {
    allPokemonAndTypeNames,
    TypeEfficacy,
    allPokemonNames,
    allTypeNames,
    AllTypesAndPokemon,
    pokemonIdsToTypes,
    pokemonNamesToIds,
    typeIdsToNames,
    typeIdsToNegativeEfficacies,
    typeIdsToPositiveEfficacies,
    typeNamesToId,
} from './data-indexes/indexes'

function getPositiveEfficacies(name: string) {
    const typeId = typeNamesToId[name.toLowerCase()]

    if (typeId === undefined) {
        return []
    }

    const strength = typeIdsToPositiveEfficacies[typeId]

    if (strength === undefined) {
        return []
    }

    return strength
}

function findClosestPokemonName(term: string) {
    return find((name: string) => startsWith(term, name))(allPokemonNames)
}

function findClosestTypeName(term: string) {
    return find((type: string) => startsWith(term, type))(allTypeNames)
}

type TypeResolution = PokemonMatch | TypeMatch | UnknownMatch

interface PokemonMatch {
    readonly matchedAs: 'pokemon name'
    readonly pokemonName: string
    readonly typeName: string
    readonly secondaryTypeName?: string
}

interface TypeMatch {
    readonly matchedAs: 'type name'
    readonly typeName: string
}

interface UnknownMatch {
    readonly matchedAs: 'unknown'
}

function getTypeName(searchTerm: string): TypeResolution {
    // Is it a pokemon name?
    const pokemonType = getTypeForPokemon(searchTerm)
    if (typeof pokemonType === 'string') {
        return { typeName: pokemonType, matchedAs: 'pokemon name', pokemonName: searchTerm }
    } else if (Array.isArray(pokemonType)) {
        return {
            typeName: pokemonType[0],
            matchedAs: 'pokemon name',
            pokemonName: searchTerm,
            secondaryTypeName: pokemonType[1],
        }
    }

    // Is it a type name?
    const typeName = typeNamesToId[searchTerm]
    if (typeName) {
        return { typeName: searchTerm, matchedAs: 'type name' }
    }

    // Retire the close logic in favor of just using the typeahead
    // Is it close to a type name?
    // const almostTypeName = findClosestTypeName(searchTerm)
    // if (almostTypeName) {
    //     return { typeName: almostTypeName, matchedAs: 'type name' }
    // }

    // // Is it close to a pokemon name? This will have horrible perf
    // const pokemonName = findClosestPokemonName(searchTerm)
    // if (typeof pokemonName === 'string') {
    //     return {
    //         typeName: getTypeForPokemon(pokemonName) as string,
    //         matchedAs: 'pokemon name',
    //         pokemonName,
    //     }
    // }

    return { matchedAs: 'unknown' }
}

type PokemonTypeResult = string | [string, string] | undefined

function getTypeForPokemon(name: string): PokemonTypeResult {
    const pokemonId = pokemonNamesToIds[name]

    if (pokemonId === undefined) {
        return
    }

    const types = pokemonIdsToTypes[pokemonId]

    if (!types) {
        return
    }

    if (types.length === 2) {
        const typeId1 = types[0].type_id
        const typeId2 = types[1].type_id
        return [typeIdsToNames[typeId1], typeIdsToNames[typeId2]]
    } else if (types.length === 1) {
        const typeId1 = types[0].type_id
        return typeIdsToNames[typeId1]
    }

    return
}

function getStrongAgainst(name: string) {
    // get the id for the type
    const typeId = typeNamesToId[name.toLowerCase()]

    if (typeId === undefined) {
        return []
    }

    return flatten(
        toPairs(typeIdsToPositiveEfficacies).map(([otherTypeId, efficacy]) => {
            return efficacy
                .filter(it => it.type_id === Number(typeId))
                .map(it => {
                    const strongAgainst: TypeEfficacy = {
                        damage_factor: it.damage_factor,
                        type_id: Number(otherTypeId),
                    }

                    return strongAgainst
                })
        })
    )
}

function getNegativeEfficacies(name: string) {
    const typeId = typeNamesToId[name.toLowerCase()]

    if (typeId === undefined) {
        return []
    }

    const weaknesses = typeIdsToNegativeEfficacies[typeId]

    if (weaknesses === undefined) {
        return []
    }

    return weaknesses
}

interface TypeEfficacyProps {
    readonly efficacy: TypeEfficacy
}

function TypeEfficacyView(props: TypeEfficacyProps) {
    const name = typeIdsToNames[props.efficacy.type_id]

    return (
        <div>
            <li>
                <span>{name}: </span>
                {props.efficacy.damage_factor}
            </li>
        </div>
    )
}

interface RenderTypeEfficacyProps {
    readonly title: string
    readonly efficacy: TypeEfficacy[]
}
function renderTypeEfficacyCard(props: RenderTypeEfficacyProps) {
    return (
        <Card>
            <span className="pkb-section-title">{props.title}</span>
            <ul>
                {props.efficacy.map(it => (
                    <TypeEfficacyView key={it.type_id} efficacy={it} />
                ))}
            </ul>
        </Card>
    )
}

interface RenderAllTypesProps {
    onClick(name: string): void
}

function renderAllTypes(props: RenderAllTypesProps) {
    const allNames = Object.keys(typeNamesToId)

    return (
        <span>
            {allNames.map(name => (
                <button key={name} onClick={() => props.onClick(name)}>
                    {name}
                </button>
            ))}
        </span>
    )
}

interface ContentData {
    readonly typeName: string
    readonly positiveEff: TypeEfficacy[]
    readonly negativeEff: TypeEfficacy[]
    readonly strongAgainst: TypeEfficacy[]
}

function getContentData(typeName: TypeResolution): ContentData[] {
    switch (typeName.matchedAs) {
        case 'unknown':
            return [
                {
                    typeName: 'unknown',
                    positiveEff: [],
                    negativeEff: [],
                    strongAgainst: [],
                },
            ]

        case 'type name':
            return [
                {
                    typeName: typeName.typeName,
                    positiveEff: getPositiveEfficacies(typeName.typeName),
                    negativeEff: getNegativeEfficacies(typeName.typeName),
                    strongAgainst: getStrongAgainst(typeName.typeName),
                },
            ]
        case 'pokemon name':
            const ret: ContentData[] = []

            ret.push({
                typeName: typeName.typeName,
                positiveEff: getPositiveEfficacies(typeName.typeName),
                negativeEff: getNegativeEfficacies(typeName.typeName),
                strongAgainst: getStrongAgainst(typeName.typeName),
            })

            if (typeName.secondaryTypeName) {
                ret.push({
                    typeName: typeName.secondaryTypeName,
                    positiveEff: getPositiveEfficacies(typeName.secondaryTypeName),
                    negativeEff: getNegativeEfficacies(typeName.secondaryTypeName),
                    strongAgainst: getStrongAgainst(typeName.secondaryTypeName),
                })
            }

            return ret
    }
}

function getReksTitle(typeName: TypeResolution): string {
    switch (typeName.matchedAs) {
        case 'unknown':
            return 'Reks by...'
        case 'pokemon name':
            return `${typeName.pokemonName} rek'd by`
        case 'type name':
            return `Rek'd by`
    }
}

function renderMenuItemChildren(option: TypeaheadResult<AllTypesAndPokemon>, props: TypeaheadMenuProps<AllTypesAndPokemon>, index: number) {
    return [
        <Highlighter key="name" search={props.text}>
            {option.name}
        </Highlighter>,
        <div key="type">
            <small>{option.type}</small>
        </div>,
    ]
}

function generateTypeaheadSelection(typeName: TypeResolution): AllTypesAndPokemon[] {
    switch (typeName.matchedAs) {
        case 'unknown':
            return []
        case 'pokemon name':
            return [{ name: typeName.pokemonName, type: 'pokemon' }]
        case 'type name':
            return [{ name: typeName.typeName, type: 'pokemon' }]
    }
}

const searchStorageKey = 'pkb_search'
function getLastSuccessSearch(): string {
    const urlParams = new URLSearchParams(window.location.search)
    const searchParam = urlParams.get('search')
    return searchParam || localStorage.getItem(searchStorageKey) || 'normal'
}

function setLastSuccessSearch(typeName: TypeResolution) {
    const urlParams = new URLSearchParams(window.location.search)
    const currentParam = urlParams.get('search')
    switch (typeName.matchedAs) {
        case 'unknown':
            return
        case 'pokemon name':
            const name = typeName.pokemonName
            document.title = `Pokeboard: ${name}`
            localStorage.setItem(searchStorageKey, typeName.pokemonName)
            if (currentParam !== name) {
                history.pushState({ search: name }, document.title, `?search=${name}`)
            }
            return
        case 'type name':
            const name2 = typeName.typeName
            document.title = `Pokeboard: ${name2}`
            localStorage.setItem(searchStorageKey, name2)
            if (currentParam !== name2) {
                history.pushState({ search: name2 }, document.title, `?search=${name2}`)
            }
            return
    }
}

export function App() {
    const [searchValue, setValue] = useState(getLastSuccessSearch())
    const typeNameResult = getTypeName(searchValue)
    setLastSuccessSearch(typeNameResult) // side effect

    useEffect(() => {
        window.onpopstate = (event: PopStateEvent) => {
            if (event.state.search) {
                setValue(event.state.search)
            }
        }
    })

    const contentData = getContentData(typeNameResult)
    const content = flatten(
        contentData.map(({ typeName, positiveEff, negativeEff, strongAgainst }) => {
            return [
                renderTypeEfficacyCard({ title: `(${typeName}) More Damage Against`, efficacy: positiveEff }),
                renderTypeEfficacyCard({ title: `(${typeName}) Less Damage Against`, efficacy: negativeEff }),
                renderTypeEfficacyCard({ title: `(as ${typeName}) ${getReksTitle(typeNameResult)}`, efficacy: strongAgainst }),
            ]
        })
    )

    function onTypeNameClick(name: string) {
        setValue(name)
    }

    const selected = generateTypeaheadSelection(typeNameResult)

    return (
        <div className="pkb-root">
            <div>{renderAllTypes({ onClick: onTypeNameClick })}</div>
            <div className="pkb-search-container">
                <Typeahead
                    id="typeahead"
                    clearButton={true}
                    renderMenuItemChildren={renderMenuItemChildren}
                    onChange={it => {
                        it[0] && setValue(it[0].name)
                    }}
                    selected={selected}
                    maxResults={5}
                    placeholder="Search for types or pokemon"
                    options={allPokemonAndTypeNames}
                    labelKey="name"
                    onInputChange={it => it[0] && setValue(it[0].toLowerCase())}
                />
            </div>

            <div className="pkb-results">{content}</div>
        </div>
    )
}
