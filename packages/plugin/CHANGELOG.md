# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [7.2.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.4...v7.2.5) (2023-08-28)


### Bug Fixes

* by default add "use strict" directive to sap.ui.define ([#115](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/115)) ([7d55cc6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/7d55cc6126258b60728a00f4070ed19b8ffe9339)), closes [#113](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/113)





## [7.2.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.3...v7.2.4) (2023-07-20)


### Bug Fixes

* ensure template to be ES5 compliant ([#111](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/111)) ([16819bc](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/16819bc91ce1942e0968a0f7efaa4e7cf767b665))





## [7.2.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.2...v7.2.3) (2023-07-18)


### Bug Fixes

* copyright comment must be appended as leading comment to file ([#108](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/108)) ([8194671](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/81946714f1d48c82a6609ec3fc1c820e5fff9e51))





## [7.2.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.1...v7.2.2) (2023-07-18)


### Bug Fixes

* ensure copyright to be kept after typescript processing ([#107](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/107)) ([da9aa69](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/da9aa69c94017e085d7f5a22abde04b123d9307d))





## [7.2.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.0...v7.2.1) (2023-06-13)


### Bug Fixes

* add support for import.meta.url|resolve ([#106](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/106)) ([afb1e6d](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/afb1e6daa0fcc9896fd184ac9d66990d0a29214a)), closes [#103](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/103)
* support for anonymous classes ([#105](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/105)) ([64773d1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/64773d180bf65e544806b9f04b7334cd76831b3d)), closes [#104](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/104)





# [7.2.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.5...v7.2.0) (2023-05-30)


### Features

* split class conversion to enable other Babel plugin conversion ([#100](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/100)) ([4ba096b](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/4ba096b1a24d807cda2fd2f57425f3ab4b91a31b)), closes [#23](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/23) [#25](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/25)





## [7.1.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.4...v7.1.5) (2023-05-30)


### Bug Fixes

* enable support for TS param props ([#99](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/99)) ([2119b41](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/2119b41fbd5fb41ade7e096190cbebad03eecf7c)), closes [#65](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/65)
* ensure copyright comments to be leading comments ([#97](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/97)) ([39ab194](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/39ab1946f08d3fc33609bd6b9ac6cda9a985c5d7))
* sap.ui.define without callback function ([#98](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/98)) ([c1cd6a8](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/c1cd6a8f158de9b5036d9c768c48972d66ae20aa)), closes [#50](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/50)





## [7.1.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.3...v7.1.4) (2023-04-11)


### Bug Fixes

* properly handle dynamic import of non-existing modules ([#94](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/94)) ([c443b36](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/c443b36d5035d2e2fa367e074d0732336af8eb78))





## [7.1.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.2...v7.1.3) (2023-04-11)


### Bug Fixes

* dynamic import must not handle __esModule flagged modules ([#93](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/93)) ([b269985](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/b26998540cac0c2c2868bd59198d6f9abfaab8f7))





## [7.1.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.1...v7.1.2) (2023-04-11)


### Bug Fixes

* dynamic imports of empty modules must not fail ([#92](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/92)) ([a1de75d](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/a1de75dcfcb577bf6fea3669cf448e9183b7d636))





## [7.1.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.0...v7.1.1) (2023-03-27)


### Bug Fixes

* catch err for dynamic import to sap.ui.require ([#91](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/91)) ([9c7d26e](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/9c7d26e6aeebc77f5d8faec941fbd994b77de222))





# [7.1.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.6...v7.1.0) (2023-03-13)


### Features

* backward compatibility for overrides (overridesToOverride option) ([dac96e6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/dac96e685548ccf831893c03e083e6db2dae3d4f))





## [7.0.6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.5...v7.0.6) (2023-02-21)

**Note:** Version bump only for package babel-plugin-transform-modules-ui5
