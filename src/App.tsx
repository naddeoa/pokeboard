import flatten from 'ramda/es/flatten'
import groupBy from 'ramda/es/groupBy'
import toPairs from 'ramda/es/toPairs'
import React, { useEffect, useRef, useState } from 'react'
import { Highlighter, Typeahead, TypeaheadMenuProps, TypeaheadResult } from 'react-bootstrap-typeahead'
import './app.css'
import { Card } from './card/Card'
import {
    allPokemonAndTypeNames,
    AllTypesAndPokemon,
    combineDefenseEfficacies,
    Efficacy,
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

    const superEff = 'Super Effective'
    const notVery = 'Not Very Effective'
    const effGroups = groupBy(it => (Number(it[0]) > 1 ? superEff : notVery), groups)

    const superEffective = effGroups[superEff]
    const notVeryEff = effGroups[notVery]

    function renderGroup(title: string, group: typeof groups) {
        if (!group) {
            return null
        }
        const jsx = group.map(([groupKey, it]) => {
            return (
                <ul className="pkb-eff-listing" key={groupKey}>
                    {it.map(([typeName, factor]) => {
                        return (
                            <li key={typeName}>
                                <span className={`pkb-type-label pkb-type-${typeName}`}>{typeName}</span>
                                {factor}x
                                <i className={`${factor > 1 ? 'up' : 'down'} pkb-eff-indicator`} />
                            </li>
                        )
                    })}
                </ul>
            )
        })

        return (
            <div className="pkb-eff-container" key={title}>
                {/* <span>{title}</span> */}
                {jsx}
            </div>
        )
    }
    const superEffJsx = renderGroup(superEff, superEffective)
    const notVeryEffJsx = renderGroup(notVery, notVeryEff)

    return (
        <Card key={props.title}>
            <div className="pkb-section-title">{props.title}</div>
            <div className="pkb-section-subtitle">{props.desc}</div>

            {superEffJsx}
            {superEffJsx && notVeryEffJsx ? <hr /> : null}
            {notVeryEffJsx}
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
                <button className={`pkb-type-${name}`} key={name} onClick={() => props.onClick(name)}>
                    {name}
                </button>
            ))}
        </span>
    )
}

interface ContentData {
    readonly typeName: string
    readonly mode: 'offense' | 'defense'
    readonly efficacy: Efficacy
}

function getContentData(typeName: TypeResolution): ContentData[] {
    switch (typeName.matchedAs) {
        case 'unknown':
            return []

        case 'type name':
            return [
                { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].offense, mode: 'offense' },
                { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].defense, mode: 'defense' },
            ]

        case 'pokemon name':
            if (typeName.secondaryTypeName) {
                return [
                    { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].offense, mode: 'offense' },
                    { typeName: typeName.secondaryTypeName, efficacy: offenseDefenseEfficacies[typeName.secondaryTypeName].offense, mode: 'offense' },
                    {
                        // Combined efficacy for targeting pokemon with multiple types
                        typeName: `${typeName.typeName}/${typeName.secondaryTypeName}`,
                        mode: 'defense',
                        efficacy: combineDefenseEfficacies(
                            offenseDefenseEfficacies[typeName.typeName].defense,
                            offenseDefenseEfficacies[typeName.secondaryTypeName].defense
                        ),
                    },
                ]
            } else {
                return [
                    { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].offense, mode: 'offense' },
                    { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].defense, mode: 'defense' },
                ]
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

function renderContentData(contentData: ContentData[]) {
    return flatten(
        contentData.map(({ typeName, efficacy, mode }) => {
            switch (mode) {
                case 'offense':
                    return renderTypeEfficacyCard({
                        title: `${typeName} attack modifiers`,
                        desc: 'modifications attacking these',
                        efficacy,
                    })
                case 'defense':
                    return renderTypeEfficacyCard({
                        title: `${typeName} defense modifiers`,
                        desc: 'modifications getting attacked by these',
                        efficacy,
                    })
            }
        })
    )
}

export function App() {
    const [searchValue, setValue] = useState(getLastSuccessSearch())
    const input = useRef<Typeahead<AllTypesAndPokemon>>(null)

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

    function onTypeNameClick(name: string) {
        setValue(name)
    }

    function onInputChange(val: AllTypesAndPokemon[]) {
        val[0] && setValue(val[0].name)
        const ref = input.current
        if (ref && val.length > 0) {
            // tslint:disable-next-line:no-any
            ;(ref as any).blur()
        }
    }

    const selected = generateTypeaheadSelection(typeNameResult)

    return (
        <div className="pkb-root">
            <div className="pkb-source-link">
                <h2>Calculate Pokemon Type Damage</h2>
                <a target="_blank" href="https://github.com/naddeoa/pokeboard">
                    Source on Github
                </a>
            </div>
            <div>{renderAllTypes({ onClick: onTypeNameClick })}</div>
            <div className="pkb-search-container">
                <Typeahead
                    ref={input}
                    id="typeahead"
                    clearButton={true}
                    renderMenuItemChildren={renderMenuItemChildren}
                    onChange={onInputChange}
                    selected={selected}
                    maxResults={5}
                    placeholder="Search for types or pokemon"
                    options={allPokemonAndTypeNames}
                    labelKey="name"
                />
            </div>

            <div className="pkb-results">{renderContentData(contentData)}</div>
        </div>
    )
}
