# Project Guidelines

## Visual behavior

- Preserve the current visual identity, palette, spacing, typography, and rounded-surface style.
- Any visual behavior change must feel smooth: prefer short, purposeful CSS transitions or animations over abrupt changes.
- Keep transitions subtle and avoid introducing motion that changes the layout or distracts from the typing experience.
- Every clickable control with a hover state must provide clear color feedback on both hover and active/click, using the existing palette and smooth transitions.
- During the typing challenge, moving to the next word after a correct answer should use a subtle `0.1s` transition delay; do not add longer navigation delays.
- In the typing challenge, use `0.3s` for visual transitions and animations, but keep the successful-word navigation delay at `0.1s`.
- Preserve the existing feedback semantics: correct characters remain green, incorrect characters remain red, and temporary hints use the existing amber color.

## Build and test

- Start the complete local application with `npm run dev`.
- Build the application with `npm run build`.
- Run focused browser tests with `npx playwright test <test-file> -g "<test name>"`.
- Keep unit and end-to-end tests aligned with behavior changes.
