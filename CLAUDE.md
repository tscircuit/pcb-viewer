# PCB-Viewer Development Guidelines

## Build & Development Commands
- Build: `npm run build` (uses tsup with browser platform)
- Format code: `npm run format` (Biome formatter)
- Check formatting: `npm run format:check`
- Type check: `npx tsc --noEmit`
- Run React Cosmos dev server: `bun run start`
- Export React Cosmos fixtures: `bun run build:cosmos`
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
This package renders circuit boards using WebGPU (`circuit-json-webgpu`) and HTML5 Canvas.
Main entry point is the PCBViewer component which takes circuit data as input.
Circuit JSON format is defined by the circuit-json package.
