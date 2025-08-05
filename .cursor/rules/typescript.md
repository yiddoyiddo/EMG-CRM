# TypeScript Rules for LeadGen CRM Project

## General Rules
- Always use TypeScript for all files
- Use strict type checking
- Avoid using `any` type when possible
- Prefer interfaces over types for object definitions
- Use type annotations for function parameters and return types

## Naming Conventions
- Use PascalCase for types, interfaces, and React components
- Use camelCase for variables, functions, and properties
- Use UPPER_CASE for constants

## File Organization
- Group related types and interfaces in a single file
- Place shared types in dedicated files under `src/lib` directory
- Co-locate component types with their implementation

## Best Practices
- Use generics when a function or class can work with multiple types
- Define explicit return types for functions with complex logic
- Use union types to represent values that can be one of several types
- Leverage TypeScript's utility types (Pick, Omit, Partial, Required, etc.)
- Use discriminated unions for state management

## React Specific
- Define prop types as interfaces
- Use React.FC sparingly, prefer explicit return types
- Use React.ReactNode for children props
- Utilize custom hooks for shared logic
- Use TypeScript with React Query for type-safe API calls 