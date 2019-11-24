import ReactDOM from 'react-dom'
import React from 'react'
import { App } from './App'
import './bootstrap.min.css'

const div = document.getElementById('root')

if (div) {
    ReactDOM.render(React.createElement(App), div)
} else {
    throw Error('Cannot find element with id root')
}
