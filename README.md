### Pokeboard

This is a little utility to get readouts of pokemon strengths/weaknesses at a glance. It's hosted at

https://naddeo.dev/demo/pokeboard/

It uses data from https://github.com/veekun/pokedex/tree/master/pokedex/data/csv mostly.

### Targets
Execute targets using `make target-name`. Most shells will autocomplete the target name if you spam tab.

* `start` - Start the webpack dev server and open the project in a browser. This is probably what you want.
* `stop` - If something goes wrong and the servers are orphaned then this will kill their saved pids in the .server-pids dir.
* `all` - Make everything and put it in `./dist`
* `build` - Build just the typescript
* `bundle` - Build the webpack bundle
