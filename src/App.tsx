import flatten from 'ramda/es/flatten'
import values from 'ramda/es/values'
import React, { useState } from 'react'
import './app.css'
import { Card } from './card/Card'
import {
    TypeEfficacy,
    typeIdsToNames,
    typeIdsToNegativeEfficacies,
    typeIdsToPositiveEfficacies,
    typeNamesToId,
    pokemonNamesToIds,
    pokemonIdsToTypes,
    allTypeNames,
    allPokemonNames,
    allPokemonAndTypeNames,
    AllTypesAndPokemon,
} from './data-indexes/indexes'
import toPairs from 'ramda/es/toPairs'
import find from 'ramda/es/find'
import startsWith from 'ramda/es/startsWith'
import { Typeahead, TypeaheadResult, TypeaheadMenuProps, Highlighter } from 'react-bootstrap-typeahead'

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
    if (pokemonType) {
        return { typeName: pokemonType, matchedAs: 'pokemon name', pokemonName: searchTerm }
    }

    // Is it a type name?
    const typeName = typeNamesToId[searchTerm]
    if (typeName) {
        return { typeName: searchTerm, matchedAs: 'type name' }
    }

    // Is it close to a type name?
    const almostTypeName = findClosestTypeName(searchTerm)
    if (almostTypeName) {
        return { typeName: almostTypeName, matchedAs: 'type name' }
    }

    // Is it close to a pokemon name? This will have horrible perf
    const pokemonName = findClosestPokemonName(searchTerm)
    if (typeof pokemonName === 'string') {
        return {
            typeName: getTypeForPokemon(pokemonName) as string,
            matchedAs: 'pokemon name',
            pokemonName,
        }
    }

    return { matchedAs: 'unknown' }
}

function getTypeForPokemon(name: string) {
    const pokemonId = pokemonNamesToIds[name]

    if (pokemonId === undefined) {
        return
    }

    const types = pokemonIdsToTypes[pokemonId]

    if (!types) {
        return
    }

    const typeId = types[0].type_id

    return typeIdsToNames[typeId]
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

function TypeEfficacy(props: TypeEfficacyProps) {
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
                    <TypeEfficacy key={it.type_id} efficacy={it} />
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
    readonly positiveEff: TypeEfficacy[]
    readonly negativeEff: TypeEfficacy[]
    readonly strongAgainst: TypeEfficacy[]
}

function getContentData(typeName: TypeResolution): ContentData {
    switch (typeName.matchedAs) {
        case 'unknown':
            return {
                positiveEff: [],
                negativeEff: [],
                strongAgainst: [],
            }

        default:
            return {
                positiveEff: getPositiveEfficacies(typeName.typeName),
                negativeEff: getNegativeEfficacies(typeName.typeName),
                strongAgainst: getStrongAgainst(typeName.typeName),
            }
    }
}

function getReksTitle(typeName: TypeResolution): string {
    switch (typeName.matchedAs) {
        case 'unknown':
            return 'Reks...'
        case 'pokemon name':
            return `Reks ${typeName.pokemonName} (${typeName.typeName})`
        case 'type name':
            return `Reks ${typeName.typeName}`
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
    return localStorage.getItem(searchStorageKey) || 'normal'
}

function setLastSuccessSearch(typeName: TypeResolution) {
    switch (typeName.matchedAs) {
        case 'unknown':
            return
        case 'pokemon name':
            const name = typeName.pokemonName
            document.title = `Pokeboard: ${name}`
            history.pushState({ search: name }, document.title, `?search=${name}`)
            localStorage.setItem(searchStorageKey, typeName.pokemonName)
            return
        case 'type name':
            const name2 = typeName.typeName
            document.title = `Pokeboard: ${name2}`
            history.pushState({ search: name2 }, document.title, `?search=${name2}`)
            localStorage.setItem(searchStorageKey, name2)
            return
    }
}

export function App() {
    const [searchValue, setValue] = useState(getLastSuccessSearch())
    const typeName = getTypeName(searchValue)
    setLastSuccessSearch(typeName) // side effect

    const { positiveEff, negativeEff, strongAgainst } = getContentData(typeName)

    function onTypeNameClick(name: string) {
        setValue(name)
    }

    const selected = generateTypeaheadSelection(typeName)

    return (
        <div className="pkb-root">
            <div>{renderAllTypes({ onClick: onTypeNameClick })}</div>
            <div className="pkb-search-container">
                {/* <span>Search: </span>
                <input autoFocus={true} value={searchValue} onChange={val => setValue(val.target.value.toLowerCase())} /> */}
                <Typeahead
                    id="typeahead"
                    clearButton={true}
                    renderMenuItemChildren={renderMenuItemChildren}
                    onChange={it => {
                        it[0] && setValue(it[0].name)
                    }}
                    selected={selected}
                    defaultInputValue={searchValue}
                    maxResults={5}
                    placeholder="Search for types or pokemon"
                    options={allPokemonAndTypeNames}
                    labelKey="name"
                    onInputChange={it => it[0] && setValue(it[0].toLowerCase())}
                />
                {/* <span> ({typeName.matchedAs})</span> */}
            </div>

            <div className="pkb-results">
                {renderTypeEfficacyCard({ title: 'More Damage Against', efficacy: positiveEff })}
                {renderTypeEfficacyCard({ title: 'Less Damage Against', efficacy: negativeEff })}
                {renderTypeEfficacyCard({ title: getReksTitle(typeName), efficacy: strongAgainst })}
            </div>
        </div>
    )
}
