import ReactDOM from 'react-dom'
import React from 'react'
import { App } from './App'
// Need this in devo but I've already got it on my site
// import './bootstrap.min.css'

const div = document.getElementById('root')

if (div) {
    ReactDOM.render(React.createElement(App), div)
} else {
    throw Error('Cannot find element with id root')
}
