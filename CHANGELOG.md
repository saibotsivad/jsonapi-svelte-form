# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

Change categories are:

* `Added` for new features.
* `Changed` for changes in existing functionality.
* `Deprecated` for once-stable features removed in upcoming releases.
* `Removed` for deprecated features removed in this release.
* `Fixed` for any bug fixes.
* `Security` to invite users to upgrade in case of vulnerabilities.

## Unreleased
### Added
### Changed
### Deprecated
### Fixed
### Removed
### Security

## [0.0.20](https://github.com/saibotsivad/jsonapi-svelte-form/compare/v0.0.19...v0.0.20) - 2022-05-10
### Changed
- **BREAKING CHANGE:** The export paths are set using the package.json `exports` property. In theory this shouldn't change anything, unless you were doing something funky. The exported things are pinned in the documentation now, and they shouldn't change in the future.
### Fixed
- Relationships were not being removed correctly, causing the form to stay in an `unsaved` state even after all changes had been reverted.

## [0.0.19](https://github.com/saibotsivad/jsonapi-svelte-form/compare/v0.0.17...v0.0.19) - 2021-10-29
### Added
- The `create` function now takes `resource` as a property, to create the resource in some initial state. If set, the `id` and `type` will be overwritten.

## [0.0.17](https://github.com/saibotsivad/jsonapi-svelte-form/compare/v0.0.0...v0.0.17) - 2021-10-21
### Changed
- Based on some conversations with @TehShrike and others, reworked to be Svelte
  components, to gain performant reactivity.

## [0.0.0](https://github.com/saibotsivad/jsonapi-svelte-form/compare/0.0.0-init...v0.0.0) - 2021-09-16
### Added
- Created the base project.
