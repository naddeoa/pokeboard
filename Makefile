workspace.dir := $(PWD)
workspace.node_modules := $(workspace.dir)/node_modules

typescript.src.dir := $(workspace.dir)/src
typescript.src.ts := $(shell find $(typescript.src.dir) -name '*.ts' -type f)
typescript.src.tsx := $(shell find $(typescript.src.dir) -name '*.tsx' -type f)
typescript.src.files := $(typescript.src.ts) $(typescript.src.tsx)

typescript.build.dir := $(workspace.dir)/artifacts
typescript.build.ts := $(patsubst $(typescript.src.dir)%.ts,$(typescript.build.dir)%.js, $(filter %.ts,$(typescript.src.files)))
typescript.build.tsx := $(patsubst $(typescript.src.dir)%.tsx,$(typescript.build.dir)%.js, $(filter %.tsx,$(typescript.src.files)))
typescript.build.files := $(typescript.build.ts) $(typescript.build.tsx)

build.dir := $(workspace.dir)/dist
build.bundle := $(workspace.dir)/dist/bundle.js

dev.url := http://localhost:8081

dev.server-dir := ./.server-pids
dev.tsc-server-file = $(dev.server-dir)/tsc
dev.webpack-dev-server-file = $(dev.server-dir)/webpack-dev-server

define i
echo "\n\e[1;34m[INFO]$(1)\e[0m\n"
endef

define w
echo "\n\e[1;93m[WARN]$(1)\e[0m\n"
endef

define e
echo "\n\e[1;91m[ERROR]$(1)\e[0m\n"
endef

.PHONY: build default start bundle clean node_modules format format-write lint lint-fix start stop test

default: build

all: build bundle format test

build: $(typescript.build.files)

bundle: $(build.bundle)

format:
	@$(call i, Checking the formatting of the ts)
	npx prettier --check "src/**/*.{ts,tsx}"

format-write:
	@$(call i, Checking the formatting of the ts files and fixing anything that can be fixed)
	npx prettier --write "src/**/*.{ts,tsx}"

lint:
	@$(call i, Linting the ts files)
	npx tslint -c tslint.json --project tslint.json 'src/**/*.{tsx,ts}'

lint-fix:
	@$(call i, Linting the ts files and fixing anything that can be fixed)
	npx tslint -c tslint.json --project tslint.json --fix 'src/**/*.{tsx,ts}'

test:
	npx jest

node_modules: $(workspace.node_modules)

start:
	@$(call i, Starting TypeScript and React Native bundler in watch mode)
	mkdir -p $(dev.server-dir)
	# Start the servers and save their pids so we can kill them later
	npx tsc -w & echo $$! > $(dev.tsc-server-file) 
	npx webpack-dev-server & echo $$! > $(dev.webpack-dev-server-file) 
	sleep 3; which xdg-open && xdg-open $(dev.url) || open $(dev.url)
	cat $(dev.webpack-dev-server-file) | xargs -I _ tail --pid=_ -f /dev/null
	# Press ctrl-c to kill the servers
	while read 2> /dev/null; do sleep 1; done;

stop:$(dev.webpack-dev-server-file) $(dev.tsc-server-file) 
	@$(call i, Killing any servers from before that may have been orphaned. You should not have to do this.)
	# If this doesn't work then use `ps aux | grep tsc-w` and `ps aux | grep webpack` to find the processes.
	cat $(dev.webpack-dev-server-file) $(dev.tsc-server-file) | xargs kill -9
	rm $(dev.webpack-dev-server-file) $(dev.tsc-server-file) 

clean:
	@$(call i, Cleaning build artifacts)
	rm -rf $(typescript.build.dir) $(build.dir)

$(typescript.build.tsx): $(typescript.build.dir)%.js: $(typescript.src.dir)%.tsx
$(typescript.build.ts): $(typescript.build.dir)%.js: $(typescript.src.dir)%.ts
$(typescript.build.files): $(workspace.node_modules)
	@$(call i, Compiling TypeScript files into JavaScript)
	npx tsc

$(build.bundle): $(typescript.build.files)
	@$(call i, Generating the webpack bundle)
	npx webpack

$(workspace.node_modules):
	@$(call i, Installing npm modules)
	npm i


