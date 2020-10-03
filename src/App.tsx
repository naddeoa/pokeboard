import ToggleButton from '@material-ui/lab/ToggleButton'
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup'
import equals from 'ramda/es/equals'
import flatten from 'ramda/es/flatten'
import groupBy from 'ramda/es/groupBy'
import intersection from 'ramda/es/intersection'
import toPairs from 'ramda/es/toPairs'
import React, { useEffect, useRef, useState } from 'react'
import { Typeahead, TypeaheadResult, TypeaheadMenuProps, Highlighter } from 'react-bootstrap-typeahead'
import './app.css'
import { Card } from './card/Card'
import {
    allPokemonNames,
    combineDefenseEfficacies,
    Efficacy,
    offenseDefenseEfficacies,
    pokemonIdsToNames,
    pokemonIdsToTypes,
    pokemonNamesToIds,
    typeIdsToNames,
    typeIdsToPokemon,
    typeNamesToId,
} from './data-indexes/indexes'

type TypeResolution = PokemonMatch | TypeMatch | UnknownMatch | MultiTypeMatch

interface MultiTypeMatch {
    readonly matchedAs: 'primary/secondary type'
    readonly typeName?: string
    readonly secondaryTypeName?: string
}

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

function getTypeName(searchTerm: SearchValue): TypeResolution {
    switch (searchTerm.type) {
        case 'TypeSearch':
            // Is it a pokemon name?
            const searchString = searchTerm.value
            const pokemonType = getTypeForPokemon(searchString)
            if (typeof pokemonType === 'string') {
                return { typeName: pokemonType, matchedAs: 'pokemon name', pokemonName: searchString }
            } else if (Array.isArray(pokemonType)) {
                return {
                    typeName: pokemonType[0],
                    matchedAs: 'pokemon name',
                    pokemonName: searchString,
                    secondaryTypeName: pokemonType[1],
                }
            }

            // Is it a type name?
            const typeName = typeNamesToId[searchString]
            if (typeName) {
                return { typeName: searchString, matchedAs: 'type name' }
            }

            return { matchedAs: 'unknown' }

        case 'TypeFilterSearch':
            return {
                matchedAs: 'primary/secondary type',
                typeName: searchTerm.typeName1 || undefined,
                secondaryTypeName: searchTerm.typeName2 || undefined,
            }
            break
    }
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

    if (types.length === -2) {
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
    onClick(name: string | null): void
    readonly selection?: string
    readonly disabledItem?: string
}

function renderAllTypes(props: RenderAllTypesProps) {
    const allNames = Object.keys(typeNamesToId)

    return (
        <span>
            {allNames.map(name => {
                const disabled = name === props.disabledItem
                const selected = name === props.selection && !disabled

                function onClick() {
                    if (selected) {
                        props.onClick(null)
                    } else {
                        !disabled && props.onClick(name)
                    }
                }
                return (
                    <button className={`${selected ? 'pkb-type-selected' : ''} pkb-type-${name}`} key={name} onClick={onClick}>
                        {name}
                    </button>
                )
            })}
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
        case 'primary/secondary type':
            if (typeName.typeName && typeName.secondaryTypeName) {
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
            } else if (typeName.typeName) {
                return [
                    { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].offense, mode: 'offense' },
                    { typeName: typeName.typeName, efficacy: offenseDefenseEfficacies[typeName.typeName].defense, mode: 'defense' },
                ]
            } else {
                return []
            }
    }
}

const appStorageKey = 'pkb-app-store2'
function getLastSuccessSearch(defaultValue: AppState): AppState {
    const storedSearchString = localStorage.getItem(appStorageKey)
    const lastAppState: AppState | null = storedSearchString ? JSON.parse(storedSearchString) : null
    const urlParams = getUrlParams()

    if (urlParams.type === 'TypeFilterUrlParams') {
        return {
            searchMode: 'TypeFilterSearch',
            lastPokemonSearch: lastAppState === null ? defaultValue.lastPokemonSearch : lastAppState.lastPokemonSearch,
            lastTypeFilterSearch: {
                type: 'TypeFilterSearch',
                typeName1: urlParams.primary,
                typeName2: urlParams.secondary,
            },
        }
    } else if (urlParams.type === 'TypeSearchUrlParams') {
        return {
            searchMode: 'TypeSearch',
            lastTypeFilterSearch: lastAppState === null ? defaultValue.lastTypeFilterSearch : lastAppState.lastTypeFilterSearch,
            lastPokemonSearch: {
                type: 'TypeSearch',
                value: urlParams.pokemonName,
            },
        }
    }

    return lastAppState || defaultValue
}

type UrlParams = TypeFilterUrlParams | TypeSearchUrlParams | UnknownUrlParams

interface TypeFilterUrlParams {
    readonly type: 'TypeFilterUrlParams'
    readonly mode: string
    readonly primary?: string
    readonly secondary?: string
}

interface TypeSearchUrlParams {
    readonly type: 'TypeSearchUrlParams'
    readonly mode: string
    readonly pokemonName: string
}

interface UnknownUrlParams {
    readonly type: 'UnknownUrlParams'
}

function getUrlParams(): UrlParams {
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    const primary = urlParams.get('primary')
    const secondary = urlParams.get('secondary')
    const pokemonName = urlParams.get('pokemonName')

    if (mode === 'TypeFilterSearch' && primary !== null) {
        return {
            type: 'TypeFilterUrlParams',
            mode: mode,
            primary,
            secondary: secondary || undefined,
        }
    } else if (mode === 'TypeSearch' && pokemonName !== null) {
        return {
            type: 'TypeSearchUrlParams',
            mode: mode,
            pokemonName,
        }
    } else {
        return { type: 'UnknownUrlParams' }
    }
}

function generateQueryString(urlParams: UrlParams): string {
    switch (urlParams.type) {
        case 'TypeSearchUrlParams':
            return `?mode=${urlParams.mode}&pokemonName=${urlParams.pokemonName}`
        case 'TypeFilterUrlParams':
            return `?mode=${urlParams.mode}&primary=${urlParams.primary || ''}&secondary=${urlParams.secondary || ''}`
        case 'UnknownUrlParams':
            return ''
    }
}

function urlParamsForState(appState: AppState): UrlParams {
    const mode = appState.searchMode
    switch (appState.searchMode) {
        case 'TypeFilterSearch':
            const { lastTypeFilterSearch } = appState
            return {
                type: 'TypeFilterUrlParams',
                mode,
                primary: lastTypeFilterSearch.typeName1,
                secondary: lastTypeFilterSearch.typeName2,
            }
        case 'TypeSearch':
            const { lastPokemonSearch } = appState
            return { type: 'TypeSearchUrlParams', mode, pokemonName: lastPokemonSearch.value }
    }
}

function renderTitle(appState: AppState, skipSiteTitle?: boolean): string {
    const prefixString = skipSiteTitle === true ? '' : 'Pokeboard: '
    switch (appState.searchMode) {
        case 'TypeFilterSearch':
            const { lastTypeFilterSearch } = appState
            const types = [lastTypeFilterSearch.typeName1, lastTypeFilterSearch.typeName2]
                .filter(it => !!it)
                .map(capitalize)
                .join(', ')
            return `${prefixString} ${types} Type Weaknesses`
        case 'TypeSearch':
            const { lastPokemonSearch } = appState
            return `${prefixString} ${lastPokemonSearch.value} Weaknesses`
    }
}

function setLastSuccessSearch(typeName: TypeResolution, appState: AppState) {
    localStorage.setItem(appStorageKey, JSON.stringify(appState))

    if (typeName !== null && typeName.matchedAs === 'unknown') {
        return
    }

    const urlParams = urlParamsForState(appState)
    const currentUrlParams = getUrlParams()

    if (equals(urlParams, currentUrlParams)) {
        // Don't persist the same state if nothing changed
        return
    }

    const title = renderTitle(appState)
    document.title = title
    history.pushState(urlParams, document.title, generateQueryString(urlParams))
}

function capitalize(str: string | undefined) {
    if (str === undefined) {
        return undefined
    }
    return str.charAt(0).toUpperCase() + str.slice(1)
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

function findMatchingPokemon(type1?: string, type2?: string): string[] {
    if (type1 && type2) {
        const t1 = typeIdsToPokemon[typeNamesToId[type1]] || []
        const t2 = typeIdsToPokemon[typeNamesToId[type2]] || []
        if (t2.length === 0) {
            return t1.map(pokemonId => pokemonIdsToNames[pokemonId])
        } else {
            return intersection(t1, t2).map(pokemonId => {
                return pokemonIdsToNames[pokemonId]
            })
        }
    } else if (type1) {
        const t1 = typeIdsToPokemon[typeNamesToId[type1]] || []
        return t1.map(pokemonId => pokemonIdsToNames[pokemonId])
    } else {
        return allPokemonNames
    }
}

type SearchValue = PokemonTypeSearch | TypeFilterSearch

interface PokemonTypeSearch {
    readonly type: 'TypeSearch'
    readonly value: string
}

interface TypeFilterSearch {
    readonly type: 'TypeFilterSearch'
    readonly typeName1?: string
    readonly typeName2?: string
}

interface SearchAreaProps {
    onSearchChange(value: SearchValue): void
    onModeChange(mode: SearchValue['type']): void
    readonly search: SearchValue
}

function SearchArea(props: SearchAreaProps) {
    const input = useRef<Typeahead<string>>(null)

    function onToggleChange(_event: unknown, val: SearchValue['type']) {
        // apparently it sends null when the selected option is picked again
        if (val !== null) {
            props.onModeChange(val)
        }
    }

    const toggle = (
        <div className="pkb-toggle-container">
            <ToggleButtonGroup value={props.search.type} exclusive={true} onChange={onToggleChange} aria-label="text alignment">
                <ToggleButton value="TypeFilterSearch" aria-label="centered">
                    Search by Types
                </ToggleButton>
                <ToggleButton value="TypeSearch" aria-label="centered">
                    Search by Pokemon
                </ToggleButton>
            </ToggleButtonGroup>
        </div>
    )

    if (props.search.type === 'TypeSearch') {
        function onInputChange(val: string[]) {
            val[0] &&
                props.onSearchChange({
                    type: 'TypeSearch',
                    value: val[0],
                })

            const ref = input.current
            if (ref && val.length > 0) {
                // tslint:disable-next-line:no-any
                ;(ref as any).blur()
            }
        }

        return (
            <div className="pkb-search-container">
                {toggle}
                <Typeahead
                    ref={input}
                    id="type-ahead"
                    clearButton={true}
                    onChange={onInputChange}
                    selected={[props.search.value]}
                    maxResults={10}
                    placeholder="Search for types or pokemon"
                    options={allPokemonNames}
                />
            </div>
        )
    } else {
        const filterSearch = props.search
        function onType1Change(typeName: string) {
            props.onSearchChange({
                ...filterSearch,
                typeName1: typeName,
            })
        }

        function onType2Change(typeName: string) {
            props.onSearchChange({
                ...filterSearch,
                typeName2: typeName,
            })
        }

        const matchingPokemon = findMatchingPokemon(filterSearch.typeName1, filterSearch.typeName2)

        function onInputChange(val: string[]) {
            const pokemonName = val[0]
            if (pokemonName) {
                const pokemonId = pokemonNamesToIds[pokemonName]
                window.open(`https://pokemondb.net/pokedex/${pokemonId}`, '_blank')
            }
        }

        return (
            <div className="pkb-search-container">
                {toggle}
                <h3>Primary type</h3>
                <div>{renderAllTypes({ onClick: onType1Change, selection: filterSearch.typeName1, disabledItem: filterSearch.typeName2 })}</div>
                <h3>Secondary type</h3>
                <div>{renderAllTypes({ onClick: onType2Change, selection: filterSearch.typeName2, disabledItem: filterSearch.typeName1 })}</div>
                <h3>Pokemon with selected types</h3>
                <Typeahead
                    id="filter-type-ahead"
                    clearButton={true}
                    onChange={onInputChange}
                    selected={[]}
                    maxResults={10}
                    placeholder="Open Pokemon in PokemonDb.net"
                    options={matchingPokemon}
                />
            </div>
        )
    }
}

interface AppState {
    readonly searchMode: SearchValue['type']
    readonly lastPokemonSearch: PokemonTypeSearch
    readonly lastTypeFilterSearch: TypeFilterSearch
}

const initialAppState: AppState = {
    searchMode: 'TypeFilterSearch',
    lastTypeFilterSearch: {
        type: 'TypeFilterSearch',
    },
    lastPokemonSearch: {
        type: 'TypeSearch',
        value: 'Charizard',
    },
}

function updateAppStateOnBack(event: PopStateEvent, appState: AppState): AppState | null {
    const urlParams: UrlParams = event.state

    if (urlParams.type === 'TypeFilterUrlParams') {
        return {
            ...appState,
            lastTypeFilterSearch: {
                type: 'TypeFilterSearch',
                typeName1: urlParams.primary,
                typeName2: urlParams.secondary,
            },
        }
    } else if (urlParams.type === 'TypeSearchUrlParams') {
        return {
            ...appState,
            lastPokemonSearch: {
                type: 'TypeSearch',
                value: urlParams.pokemonName,
            },
        }
    } else {
        return null
    }
}

export function App() {
    const [appState, setValue] = useState<AppState>(() => getLastSuccessSearch(initialAppState))

    let searchValue
    if (appState.searchMode === 'TypeFilterSearch') {
        searchValue = appState.lastTypeFilterSearch
    } else {
        searchValue = appState.lastPokemonSearch
    }

    const typeNameResult = getTypeName(searchValue)

    useEffect(() => {
        const title = renderTitle(appState)
        document.title = title
        const desc = document.querySelector('meta[name="description"]')
        if (desc) {
            desc.setAttribute('content', title)
        }
        window.onpopstate = (event: PopStateEvent) => {
            const updated = updateAppStateOnBack(event, appState)
            if (updated !== null) {
                setValue(updated)
            }
        }
    }, [])

    const contentData = getContentData(typeNameResult)

    function onInputChange(value: SearchValue) {
        if (value.type === 'TypeFilterSearch') {
            const newState = { ...appState, lastTypeFilterSearch: value }
            setValue(newState)
            setLastSuccessSearch(typeNameResult, newState) // side effect
        } else {
            const newState = { ...appState, lastPokemonSearch: value }
            setValue(newState)
            setLastSuccessSearch(typeNameResult, newState) // side effect
        }
    }

    function onModeChange(mode: SearchValue['type']) {
        const newState = { ...appState, searchMode: mode }
        setValue(newState)
        setLastSuccessSearch(typeNameResult, newState) // side effect
    }

    return (
        <div className="pkb-root">
            <div className="pkb-source-link">
                <h1>{renderTitle(appState, true)}</h1>
                <a target="_blank" href="https://github.com/naddeoa/pokeboard">
                    Source on Github
                </a>
            </div>

            <p>
                A standalone web app to calculate Pokemon type weaknesses against other types or look them up by Pokemon. Made during the sword and shield era.
            </p>
            <SearchArea onModeChange={onModeChange} onSearchChange={onInputChange} search={searchValue} />

            <div className="pkb-results">{renderContentData(contentData)}</div>
        </div>
    )
}
