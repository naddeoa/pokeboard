import flatten from 'ramda/es/flatten'
import groupBy from 'ramda/es/groupBy'
import toPairs from 'ramda/es/toPairs'
import React, { useEffect, useState } from 'react'
import { Highlighter, Typeahead, TypeaheadMenuProps, TypeaheadResult } from 'react-bootstrap-typeahead'
import './app.css'
import { Card } from './card/Card'
import {
    allPokemonAndTypeNames,
    AllTypesAndPokemon,
    combineOffenseDefense,
    Efficacy,
    OffenseDefense,
    offenseDefenseEfficacies,
    pokemonIdsToTypes,
    pokemonNamesToIds,
    typeIdsToNames,
    typeNamesToId,
} from './data-indexes/indexes'

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

interface RenderTypeEfficacyProps {
    readonly title: string
    readonly desc: string
    readonly efficacy: Efficacy
}
function renderTypeEfficacyCard(props: RenderTypeEfficacyProps) {
    const activeModifiers = toPairs(props.efficacy).filter(([_, factor]) => factor !== 1)
    const groups = toPairs(groupBy((it: [string, number]) => String(it[1]))(activeModifiers))

    groups.sort((a, b) => {
        if (a[0] > b[0]) {
            return -1
        } else if (a[0] === b[0]) {
            return 0
        } else {
            return 1
        }
    })

    const jsx = groups.map(([groupKey, it]) => {
        return (
            <ul key={groupKey}>
                {it.map(([typeName, factor]) => {
                    return (
                        <li key={typeName}>
                            <span>{typeName}: </span>
                            {factor}
                        </li>
                    )
                })}
            </ul>
        )
    })

    return (
        <Card key={props.title}>
            <div className="pkb-section-title">{props.title}</div>
            <small>{props.desc}</small>
            {jsx}
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
    readonly offDeff: OffenseDefense[]
}

function getContentData(typeName: TypeResolution): ContentData {
    switch (typeName.matchedAs) {
        case 'unknown':
            return { typeName: 'unknown', offDeff: [] }

        case 'type name':
            return { typeName: typeName.typeName, offDeff: [offenseDefenseEfficacies[typeName.typeName]] }

        case 'pokemon name':
            if (typeName.secondaryTypeName) {
                return {
                    typeName: `${typeName.typeName}+${typeName.secondaryTypeName}`,
                    offDeff: [combineOffenseDefense(offenseDefenseEfficacies[typeName.typeName], offenseDefenseEfficacies[typeName.secondaryTypeName])],
                }
            } else {
                return { typeName: typeName.typeName, offDeff: [offenseDefenseEfficacies[typeName.typeName]] }
            }
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
        contentData.offDeff.map(({ offense, defense }) => {
            return [
                renderTypeEfficacyCard({
                    title: `${contentData.typeName} attack modifiers`,
                    desc: 'modifications attacking these',
                    efficacy: offense,
                }),
                renderTypeEfficacyCard({
                    title: `${contentData.typeName} defense modifiers`,
                    desc: 'modifications getting attacked by these',
                    efficacy: defense,
                }),
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
