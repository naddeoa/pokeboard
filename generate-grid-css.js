const min = 1
const max = 5

function generateGridCss() {
    for (let i = min; i < max; i++) {
        for (let j = 0; j < max; j++) {
            console.log(`
.pkb-card-${i}x${j} {
    grid-column-start: 0;
    grid-column-end: span ${i};
    grid-row-start: 0;
    grid-row-end: span ${j};
}`)
        }
    }
}

function generateSizeProps() {
    for (let i = min; i < max; i++) {
        for (let j = 0; j < max; j++) {
            console.log(`| '${i}x${j}'`)
        }
    }
}

if (process.argv[2] === 'css') {
    generateGridCss()
} else if (process.argv[2] === 'props') {
    generateSizeProps()
} else {
    console.log('specify either "css" or "props"')
}
