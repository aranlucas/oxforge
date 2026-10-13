# Rule coverage and decisions

Every explicit Oxlint rule from the owned projects is accounted for here. `docs/projects.json` retains the original options, ignores, and overrides. Shared presets select the strongest observed severity and promote warnings to errors; the deliberate resolutions below take precedence. Category defaults add rules beyond this explicit list.

## Strict consolidation in 0.2.0

The portfolio rollout preserves the strongest existing rule settings rather than weakening a repository during migration. [Rule provenance](stricter-rules.json) lists the existing projects that supply stronger category-enabled rules.

- Equality always uses strict operators, including null checks.
- Files are limited to 300 lines, functions to 50 lines, and modules to 10 dependencies, including comments and blank lines. These are the native defaults already enabled by the website and Raleigh configurations. The size-limits preset remains an alias for the same defaults.
- Unicode regular expressions, explicit length checks, arrow callbacks for array methods, number coercion, top-level await, positive conditions, separate comments, and sorted variable declarations are enforced.
- Unsafe assertions, confusing void expressions, deprecated APIs, unnecessary type parameters, strict boolean expressions, and strict void returns are errors. The readonly-parameter policy comes from Raleigh, including its ReactNode, KeyboardEvent, and Promise exemptions and inferred-parameter handling.
- All TypeScript suppression comments are forbidden except ts-check. Unused-variable and dangling-underscore exemptions no longer weaken the native defaults.
- React accessibility, constructed context values, effect dependencies, target-blank protection, and unsafe lifecycle checks are errors. Custom Image components receive alt-text checks without excluding the native element defaults.
- The Next.js preset keeps the component-export rule enabled while recognizing the framework's documented metadata and route-segment exports. Other mixed exports remain errors.
- The Vitest preset requires typed mocks and unconditional tests.
- The shadcn preset includes the existing native-element restrictions from set-and-signal, with messages referring to the consuming project's UI library. Implementation files must define native elements; their scoped implementation configuration remains local.
- The MCP preset owns the server-import restrictions from ai-shopping-mcp, including the base restriction against deprecated react-test-renderer.
- Tailwind line wrapping is enforced with the observed 2000-column class-list limit. Stylesheet paths, custom components, SDK globals, and generated-file paths remain project configuration.
- All 18 anti-slop rules and module-level named types remain enabled. Assertions still require safety comments; a comment does not bypass the native unsafe-assertion rule.
- Formatting defaults remain 100 columns, semicolons, double quotes, and two spaces. Explicit repository format choices can be retained with the static formatter export.

## Coverage

| Observed rule                                          | Shared home                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `anti-slop/no-array-filter-map`                        | `anti-slop`                                                    |
| `anti-slop/no-chained-type-assertions`                 | `anti-slop`                                                    |
| `anti-slop/no-conditional-empty-object-spread`         | `anti-slop`                                                    |
| `anti-slop/no-known-value-widening`                    | `anti-slop`                                                    |
| `anti-slop/no-module-mocking`                          | `anti-slop`                                                    |
| `anti-slop/no-object-parameters`                       | `anti-slop`                                                    |
| `anti-slop/no-reduce-accumulator-copy`                 | `anti-slop`                                                    |
| `anti-slop/no-reflect-apply`                           | `anti-slop`                                                    |
| `anti-slop/no-reflect-get`                             | `anti-slop`                                                    |
| `anti-slop/no-runtime-typeof`                          | `anti-slop`                                                    |
| `anti-slop/no-shape-in-symbol-names`                   | `anti-slop`                                                    |
| `anti-slop/no-unknown-parameters`                      | `anti-slop`                                                    |
| `anti-slop/no-unknown-returns`                         | `anti-slop`                                                    |
| `anti-slop/no-unknown-type-aliases`                    | `anti-slop`                                                    |
| `anti-slop/no-unsafe-dictionary-type`                  | `anti-slop`                                                    |
| `anti-slop/no-widen-then-assert`                       | `anti-slop`                                                    |
| `anti-slop/require-readable-spacing`                   | `anti-slop`                                                    |
| `anti-slop/require-safety-comment-for-type-assertion`  | `anti-slop`                                                    |
| `eslint/curly`                                         | `base`                                                         |
| `eslint/eqeqeq`                                        | `base`                                                         |
| `eslint/func-style`                                    | `base`                                                         |
| `eslint/id-length`                                     | `base`                                                         |
| `eslint/max-lines`                                     | `size-limits`                                                  |
| `eslint/max-lines-per-function`                        | `size-limits`                                                  |
| `eslint/max-statements`                                | `base`                                                         |
| `eslint/new-cap`                                       | `base`                                                         |
| `eslint/no-array-constructor`                          | `base`                                                         |
| `eslint/no-async-promise-executor`                     | `base`                                                         |
| `eslint/no-await-in-loop`                              | `base`                                                         |
| `eslint/no-console`                                    | `base`                                                         |
| `eslint/no-control-regex`                              | Project override (application-specific or conflicting options) |
| `eslint/no-debugger`                                   | `base`                                                         |
| `eslint/no-eval`                                       | `base`                                                         |
| `eslint/no-implied-eval`                               | `base`                                                         |
| `eslint/no-inline-comments`                            | `base`                                                         |
| `eslint/no-irregular-whitespace`                       | Project override (application-specific or conflicting options) |
| `eslint/no-magic-numbers`                              | `base`                                                         |
| `eslint/no-negated-condition`                          | `base`                                                         |
| `eslint/no-new-func`                                   | `base`                                                         |
| `eslint/no-restricted-imports`                         | `base`                                                         |
| `eslint/no-shadow`                                     | `base`                                                         |
| `eslint/no-ternary`                                    | `base`                                                         |
| `eslint/no-throw-literal`                              | `base`                                                         |
| `eslint/no-underscore-dangle`                          | `base`                                                         |
| `eslint/no-unused-expressions`                         | `base`                                                         |
| `eslint/no-unused-vars`                                | `base`                                                         |
| `eslint/no-useless-assignment`                         | `base`                                                         |
| `eslint/no-var`                                        | `base`                                                         |
| `eslint/no-warning-comments`                           | `base`                                                         |
| `eslint/one-var`                                       | `base`                                                         |
| `eslint/prefer-const`                                  | `base`                                                         |
| `eslint/preserve-caught-error`                         | `base`                                                         |
| `eslint/require-unicode-regexp`                        | `base`                                                         |
| `eslint/sort-imports`                                  | `base`                                                         |
| `eslint/sort-keys`                                     | `base`                                                         |
| `eslint/sort-vars`                                     | `base`                                                         |
| `import/consistent-type-specifier-style`               | `base`                                                         |
| `import/exports-last`                                  | `base`                                                         |
| `import/max-dependencies`                              | `size-limits`                                                  |
| `import/no-anonymous-default-export`                   | `base`                                                         |
| `import/no-cycle`                                      | `base`                                                         |
| `import/no-duplicates`                                 | `base`                                                         |
| `import/no-named-as-default`                           | `base`                                                         |
| `import/no-named-as-default-member`                    | `base`                                                         |
| `import/no-named-export`                               | `base`                                                         |
| `import/no-namespace`                                  | `base`                                                         |
| `import/no-unassigned-import`                          | `base`                                                         |
| `import/prefer-default-export`                         | `base`                                                         |
| `jsx-a11y/alt-text`                                    | `react`                                                        |
| `jsx-a11y/aria-props`                                  | `react`                                                        |
| `jsx-a11y/aria-proptypes`                              | `react`                                                        |
| `jsx-a11y/aria-role`                                   | `react`                                                        |
| `jsx-a11y/aria-unsupported-elements`                   | `react`                                                        |
| `jsx-a11y/control-has-associated-label`                | `react`                                                        |
| `jsx-a11y/heading-has-content`                         | `react`                                                        |
| `jsx-a11y/label-has-associated-control`                | `react`                                                        |
| `jsx-a11y/no-noninteractive-element-interactions`      | `react`                                                        |
| `jsx-a11y/no-redundant-roles`                          | `react`                                                        |
| `jsx-a11y/prefer-tag-over-role`                        | `react`                                                        |
| `jsx-a11y/role-has-required-aria-props`                | `react`                                                        |
| `jsx-a11y/role-supports-aria-props`                    | `react`                                                        |
| `local/no-inline-types`                                | `oxforge/no-inline-types` (default plugin)                     |
| `nextjs/google-font-display`                           | `nextjs`                                                       |
| `nextjs/google-font-preconnect`                        | `nextjs`                                                       |
| `nextjs/inline-script-id`                              | `nextjs`                                                       |
| `nextjs/next-script-for-ga`                            | `nextjs`                                                       |
| `nextjs/no-assign-module-variable`                     | `nextjs`                                                       |
| `nextjs/no-async-client-component`                     | `nextjs`                                                       |
| `nextjs/no-before-interactive-script-outside-document` | `nextjs`                                                       |
| `nextjs/no-css-tags`                                   | `nextjs`                                                       |
| `nextjs/no-document-import-in-page`                    | `nextjs`                                                       |
| `nextjs/no-duplicate-head`                             | `nextjs`                                                       |
| `nextjs/no-head-element`                               | `nextjs`                                                       |
| `nextjs/no-head-import-in-document`                    | `nextjs`                                                       |
| `nextjs/no-html-link-for-pages`                        | `nextjs`                                                       |
| `nextjs/no-img-element`                                | `nextjs`                                                       |
| `nextjs/no-page-custom-font`                           | `nextjs`                                                       |
| `nextjs/no-script-component-in-head`                   | `nextjs`                                                       |
| `nextjs/no-styled-jsx-in-document`                     | `nextjs`                                                       |
| `nextjs/no-sync-scripts`                               | `nextjs`                                                       |
| `nextjs/no-title-in-document-head`                     | `nextjs`                                                       |
| `nextjs/no-typos`                                      | `nextjs`                                                       |
| `nextjs/no-unwanted-polyfillio`                        | `nextjs`                                                       |
| `oxc/no-accumulating-spread`                           | `base`                                                         |
| `oxc/no-map-spread`                                    | `base`                                                         |
| `promise/no-nesting`                                   | `base`                                                         |
| `promise/param-names`                                  | `base`                                                         |
| `react-perf/jsx-no-jsx-as-prop`                        | `react-perf`                                                   |
| `react-perf/jsx-no-new-function-as-prop`               | `react-perf`                                                   |
| `react-perf/jsx-no-new-object-as-prop`                 | `react-perf`                                                   |
| `react/button-has-type`                                | `react`                                                        |
| `react/display-name`                                   | `react`                                                        |
| `react/error-boundaries`                               | `react`                                                        |
| `react/exhaustive-deps`                                | `react`                                                        |
| `react/exhaustive-effect-dependencies`                 | `react`                                                        |
| `react/forbid-elements`                                | Project override (application-specific or conflicting options) |
| `react/globals`                                        | `react`                                                        |
| `react/immutability`                                   | `react`                                                        |
| `react/incompatible-library`                           | `react`                                                        |
| `react/jsx-key`                                        | `react`                                                        |
| `react/jsx-max-depth`                                  | `react`                                                        |
| `react/jsx-no-comment-textnodes`                       | `react`                                                        |
| `react/jsx-no-constructed-context-values`              | `react`                                                        |
| `react/jsx-no-duplicate-props`                         | `react`                                                        |
| `react/jsx-no-target-blank`                            | `react`                                                        |
| `react/jsx-no-undef`                                   | `react`                                                        |
| `react/jsx-no-useless-fragment`                        | `react`                                                        |
| `react/jsx-props-no-spreading`                         | `react`                                                        |
| `react/memo-dependencies`                              | `react`                                                        |
| `react/no-array-index-key`                             | `react`                                                        |
| `react/no-children-prop`                               | `react`                                                        |
| `react/no-danger-with-children`                        | `react`                                                        |
| `react/no-direct-mutation-state`                       | `react`                                                        |
| `react/no-find-dom-node`                               | `react`                                                        |
| `react/no-is-mounted`                                  | `react`                                                        |
| `react/no-render-return-value`                         | `react`                                                        |
| `react/no-string-refs`                                 | `react`                                                        |
| `react/no-unescaped-entities`                          | `react`                                                        |
| `react/no-unknown-property`                            | `react`                                                        |
| `react/no-unsafe`                                      | `react`                                                        |
| `react/no-unstable-nested-components`                  | `react`                                                        |
| `react/only-export-components`                         | `react`                                                        |
| `react/preserve-manual-memoization`                    | `react`                                                        |
| `react/purity`                                         | `react`                                                        |
| `react/react-in-jsx-scope`                             | `react`                                                        |
| `react/refs`                                           | `react`                                                        |
| `react/require-render-return`                          | `react`                                                        |
| `react/rules-of-hooks`                                 | `react`                                                        |
| `react/self-closing-comp`                              | `react`                                                        |
| `react/set-state-in-effect`                            | `react`                                                        |
| `react/set-state-in-render`                            | `react`                                                        |
| `react/static-components`                              | `react`                                                        |
| `react/style-prop-object`                              | `react`                                                        |
| `react/unsupported-syntax`                             | `react`                                                        |
| `react/use-memo`                                       | `react`                                                        |
| `shadcn/no-arbitrary-values`                           | `shadcn`                                                       |
| `shadcn/no-inline-styles`                              | `shadcn`                                                       |
| `shadcn/no-raw-colors`                                 | `shadcn`                                                       |
| `shadcn/no-restyle`                                    | `shadcn`                                                       |
| `shadcn/no-unknown-classes`                            | `shadcn`                                                       |
| `shadcn/require-static-classes`                        | `shadcn`                                                       |
| `tailwindcss/consistent-variant-order`                 | `tailwind`                                                     |
| `tailwindcss/enforce-canonical`                        | `tailwind`                                                     |
| `tailwindcss/enforce-consistent-important-position`    | `tailwind`                                                     |
| `tailwindcss/enforce-consistent-line-wrapping`         | `tailwind`                                                     |
| `tailwindcss/enforce-consistent-variable-syntax`       | `tailwind`                                                     |
| `tailwindcss/enforce-logical`                          | `tailwind`                                                     |
| `tailwindcss/enforce-negative-arbitrary-values`        | `tailwind`                                                     |
| `tailwindcss/enforce-physical`                         | `tailwind`                                                     |
| `tailwindcss/enforce-shorthand`                        | `tailwind`                                                     |
| `tailwindcss/enforce-sort-order`                       | `tailwind`                                                     |
| `tailwindcss/max-class-count`                          | `tailwind`                                                     |
| `tailwindcss/no-arbitrary-value`                       | `tailwind`                                                     |
| `tailwindcss/no-conflicting-classes`                   | `tailwind`                                                     |
| `tailwindcss/no-contradicting-variants`                | `tailwind`                                                     |
| `tailwindcss/no-dark-without-light`                    | `tailwind`                                                     |
| `tailwindcss/no-deprecated-classes`                    | `tailwind`                                                     |
| `tailwindcss/no-duplicate-classes`                     | `tailwind`                                                     |
| `tailwindcss/no-hardcoded-colors`                      | `tailwind`                                                     |
| `tailwindcss/no-restricted-classes`                    | `tailwind`                                                     |
| `tailwindcss/no-unknown-classes`                       | `tailwind`                                                     |
| `tailwindcss/no-unnecessary-arbitrary-value`           | `tailwind`                                                     |
| `tailwindcss/no-unnecessary-whitespace`                | `tailwind`                                                     |
| `tailwindcss/prefer-scale-token`                       | `tailwind`                                                     |
| `tailwindcss/prefer-theme-tokens`                      | `tailwind`                                                     |
| `typescript/await-thenable`                            | `type-aware`                                                   |
| `typescript/ban-ts-comment`                            | `base`                                                         |
| `typescript/consistent-return`                         | `type-aware`                                                   |
| `typescript/consistent-type-imports`                   | `base`                                                         |
| `typescript/no-base-to-string`                         | `type-aware`                                                   |
| `typescript/no-confusing-void-expression`              | `type-aware`                                                   |
| `typescript/no-deprecated`                             | `type-aware`                                                   |
| `typescript/no-duplicate-enum-values`                  | `base`                                                         |
| `typescript/no-empty-object-type`                      | `base`                                                         |
| `typescript/no-explicit-any`                           | `base`                                                         |
| `typescript/no-extra-non-null-assertion`               | `base`                                                         |
| `typescript/no-floating-promises`                      | `type-aware`                                                   |
| `typescript/no-misused-new`                            | `base`                                                         |
| `typescript/no-misused-promises`                       | `type-aware`                                                   |
| `typescript/no-misused-spread`                         | `type-aware`                                                   |
| `typescript/no-namespace`                              | `base`                                                         |
| `typescript/no-non-null-asserted-optional-chain`       | `base`                                                         |
| `typescript/no-non-null-assertion`                     | `base`                                                         |
| `typescript/no-redundant-type-constituents`            | `type-aware`                                                   |
| `typescript/no-require-imports`                        | `base`                                                         |
| `typescript/no-this-alias`                             | `base`                                                         |
| `typescript/no-unnecessary-boolean-literal-compare`    | `type-aware`                                                   |
| `typescript/no-unnecessary-type-assertion`             | `type-aware`                                                   |
| `typescript/no-unnecessary-type-constraint`            | `base`                                                         |
| `typescript/no-unnecessary-type-conversion`            | `type-aware`                                                   |
| `typescript/no-unnecessary-type-parameters`            | `type-aware`                                                   |
| `typescript/no-unsafe-argument`                        | `type-aware`                                                   |
| `typescript/no-unsafe-assignment`                      | `type-aware`                                                   |
| `typescript/no-unsafe-call`                            | `type-aware`                                                   |
| `typescript/no-unsafe-declaration-merging`             | `base`                                                         |
| `typescript/no-unsafe-function-type`                   | `base`                                                         |
| `typescript/no-unsafe-member-access`                   | `type-aware`                                                   |
| `typescript/no-unsafe-return`                          | `type-aware`                                                   |
| `typescript/no-unsafe-type-assertion`                  | `type-aware`                                                   |
| `typescript/no-wrapper-object-types`                   | `base`                                                         |
| `typescript/prefer-as-const`                           | `base`                                                         |
| `typescript/prefer-function-type`                      | `base`                                                         |
| `typescript/prefer-namespace-keyword`                  | `base`                                                         |
| `typescript/prefer-nullish-coalescing`                 | `type-aware`                                                   |
| `typescript/prefer-optional-chain`                     | `type-aware`                                                   |
| `typescript/prefer-readonly-parameter-types`           | Project override (application-specific or conflicting options) |
| `typescript/strict-boolean-expressions`                | `type-aware`                                                   |
| `typescript/strict-void-return`                        | `type-aware`                                                   |
| `typescript/switch-exhaustiveness-check`               | `type-aware`                                                   |
| `typescript/triple-slash-reference`                    | `base`                                                         |
| `typescript/unbound-method`                            | `type-aware`                                                   |
| `unicorn/consistent-function-scoping`                  | `base`                                                         |
| `unicorn/explicit-length-check`                        | `base`                                                         |
| `unicorn/filename-case`                                | `base`                                                         |
| `unicorn/max-nested-calls`                             | `base`                                                         |
| `unicorn/no-array-callback-reference`                  | `base`                                                         |
| `unicorn/no-array-for-each`                            | `base`                                                         |
| `unicorn/no-array-reverse`                             | `base`                                                         |
| `unicorn/no-array-sort`                                | `base`                                                         |
| `unicorn/no-negated-condition`                         | `base`                                                         |
| `unicorn/no-new-array`                                 | Project override (application-specific or conflicting options) |
| `unicorn/no-null`                                      | `base`                                                         |
| `unicorn/no-useless-fallback-in-spread`                | `base`                                                         |
| `unicorn/no-useless-spread`                            | `base`                                                         |
| `unicorn/prefer-add-event-listener`                    | `base`                                                         |
| `unicorn/prefer-at`                                    | `base`                                                         |
| `unicorn/prefer-node-protocol`                         | `base`                                                         |
| `unicorn/prefer-number-coercion`                       | `base`                                                         |
| `unicorn/prefer-optional-catch-binding`                | `base`                                                         |
| `unicorn/prefer-set-has`                               | `base`                                                         |
| `unicorn/prefer-top-level-await`                       | `base`                                                         |
| `unicorn/throw-new-error`                              | `base`                                                         |
| `vitest/no-conditional-in-test`                        | `vitest`                                                       |
| `vitest/no-disabled-tests`                             | `vitest`                                                       |
| `vitest/no-focused-tests`                              | `vitest`                                                       |
| `vitest/require-mock-type-parameters`                  | `vitest`                                                       |
| `vitest/valid-expect`                                  | `vitest`                                                       |

## Legacy ESLint review

The owned executable ESLint configs were also read directly, without executing them. `documentation/eslint.config.mjs` contributes `typescript/restrict-template-expressions` with its exact options, `react/jsx-curly-brace-presence` (promoted from warning to error), and the explicit return-type rule exclusions. Its `no-floating-promises`, `react/no-unescaped-entities`, and Next image exclusions conflict with stronger Oxlint policies and stay available as project overrides. `import/no-anonymous-default-export` takes the stronger Oxlint setting.

`grocery-agent-mobile/eslint.config.js` contributes the same strict promises, hooks, debugger, and unused-disable policies already selected by Oxforge. Its generated files, UI-specific `immutability`/`refs` exceptions, and review-script import resolution exception stay local. Oxfmt replaces its Prettier integration. `LokalBot/Distribution/raycast/eslint.config.js` only imports Raycast's preset; a Raycast app should retain framework checks from that preset while adopting shared formatting or explicitly migrate supported rules. Imported third-party presets are not represented as individually audited rules in the 257-rule explicit Oxlint count.

The legacy `jsx-a11y/no-onchange` rule has no native rule in Oxlint 1.88.0. It should remain in an ESLint sidecar if still required. Disabled obsolete `interface-name-prefix` and TypeScript-irrelevant `react/prop-types` rules are not loaded as unknown Oxlint rules. The strict shared React setting for unescaped entities can be turned off in the documentation app to preserve its existing behavior.

Documentation's Prettier exceptions are `semi: false` and `trailingComma: "es5"`; all other explicit settings match the formatter defaults. The mobile Prettier config matches Oxforge's defaults.
