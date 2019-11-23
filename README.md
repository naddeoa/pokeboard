
This is a minimal template project that lets you build using a Makefile. It sets up some reasonable defaults for TypeScript, React, Webpack, TSLint, and Prettier. Build everything with `make all`

### Targets
Execute targets using `make target-name`. Most shells will autocomplete the target name if you spam tab.

* `start` - Start the webpack dev server and open the project in a browser. This is probably what you want.
* `stop` - If something goes wrong and the servers are orphaned then this will kill their saved pids in the .server-pids dir.
* `all` - Make everything and put it in `./dist`
* `build` - Build just the typescript
* `bundle` - Build the webpack bundle
