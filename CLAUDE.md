# PCB-Viewer Development Guidelines

## Build & Development Commands
- Build: `bun run build` or `npm run build` (uses tsup with browser platform)
- Format code: `bun run format` or `npm run format` (Biome formatter)
- Check formatting: `bun run format:check` or `npm run format:check`
- Type check: `npx tsc --noEmit`
- Run React Cosmos dev server: `bun run start` or `bun run cosmos`
- Export React Cosmos static site: `bun run cosmos-export`
- Build and publish to yalc: `npm run yalc`

## Code Style Guidelines
- **TypeScript**: Strict mode enabled
- **Formatting**: Uses Biome with 2-space indentation
- **JSX**: Double quotes for JSX attributes
- **Imports**: Organize imports enabled (handled by Biome)
- **Semicolons**: Only as needed (determined by Biome)
- **Naming**: Component files use PascalCase, other files use kebab-case
- **Component Structure**: React Functional Components with explicit typing
- **Type Declarations**: Prefer type over interface, explicit typings
- **Nullish Values**: Use ?? operator for defaults, proper null checks
- **Error Handling**: Use try/catch for async operations
- **State Management**: Combination of React hooks and Zustand

## Project Architecture
This package renders printed circuit boards from Circuit JSON (`circuit-json`) using either the WebGPU worker renderer (`@tscircuit/circuit-json-webgpu`) or the 2D Canvas renderer (`circuit-to-canvas`).
The main entry point is the `PCBViewer` component (`src/PCBViewer.tsx`), which accepts a `circuitJson` array and interactive viewer props.
