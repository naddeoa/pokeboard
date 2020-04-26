### Pokeboard

This is a little utility to get readouts of pokemon strengths/weaknesses at a glance. It's hosted at

https://naddeo.org/pokeboard/

Some examples searches:
- [normal type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=normal)
- [fighting type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=fighting)
- [flying type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=flying)
- [poison type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=poison)
- [ground type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=ground)
- [rock type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=rock)
- [bug type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=bug)
- [ghost type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=ghost)
- [steel type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=steel)
- [fire type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=fire)
- [water type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=water)
- [grass type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=grass)
- [electric type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=electric)
- [psychic type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=psychic)
- [ice type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=ice)
- [dragon type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=dragon)
- [dark type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=dark)
- [fairy type weaknesses](https://naddeo.org/pokeboard/?mode=TypeFilterSearch&primary=fairy)


It uses data from https://github.com/veekun/pokedex/tree/master/pokedex/data/csv mostly.

### Targets
Execute targets using `make target-name`. Most shells will autocomplete the target name if you spam tab.

* `start` - Start the webpack dev server and open the project in a browser. This is probably what you want.
* `stop` - If something goes wrong and the servers are orphaned then this will kill their saved pids in the .server-pids dir.
* `all` - Make everything and put it in `./dist`
* `build` - Build just the typescript
* `bundle` - Build the webpack bundle
