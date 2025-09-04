# SwagMusic Development Guidelines

This document provides essential development information for the SwagMusic project, a Vue.js/Nuxt.js music streaming application.

## Project Overview

SwagMusic is a modern music streaming application built with:
- **Frontend**: Vue 3 + Nuxt 3 + TypeScript
- **Styling**: Tailwind CSS + Nuxt UI
- **State Management**: Pinia
- **Audio**: Howler.js
- **Backend**: Supabase
- **Testing**: Vitest with happy-dom and Playwright
- **Linting**: ESLint with TypeScript support

## Build & Configuration Instructions

### Prerequisites
- Node.js (version specified in package.json engines, if any)
- npm or yarn package manager

### Environment Setup
Create a `.env` file in the project root with the following variables:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

These variables are required for:
- `SUPABASE_URL` & `SUPABASE_KEY`: Client-side Supabase configuration
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side API operations (user management)

### Installation & Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Generate static site
npm run generate

# Preview production build
npm run preview
```

### Key Configuration Files
- `nuxt.config.ts`: Main Nuxt configuration with modules and Supabase setup
- `vitest.config.ts`: Testing configuration with unit and browser test projects
- `eslint.config.mjs`: Linting rules for TypeScript and Vue components
- `tsconfig.json`: TypeScript configuration

## Testing Information

### Test Structure
The project uses Vitest with two test environments:

1. **Unit Tests** (happy-dom environment)
   - Location: `tests/unit/**/*.{test,spec}.ts` or `tests/**/*.unit.{test,spec}.ts`
   - Fast DOM simulation for component and utility testing

2. **Browser Tests** (Playwright with Chromium)
   - Location: `tests/browser/**/*.{test,spec}.ts` or `tests/**/*.browser.{test,spec}.ts`
   - Real browser testing for complex interactions

### Running Tests
```bash
# Run all tests
npm run test

# Run only unit tests
npm run test:unit

# Run only browser tests (requires Chromium)
npm run test:browser
```

### Test Example
Create test files following this pattern:

```typescript
import { describe, it, expect } from 'vitest'

describe('Component or Feature Name', () => {
  it('should test specific functionality', () => {
    const result = someFunction()
    expect(result).toBe(expectedValue)
  })
})
```

**Note**: The `tests` directory is excluded from version control but exists locally for development.

## Code Style Guidelines

### ESLint Configuration
The project uses TypeScript-aware ESLint with custom rules:

- `@typescript-eslint/no-unused-vars`: Warning (not error)
- `@typescript-eslint/no-explicit-any`: Disabled
- `@typescript-eslint/no-floating-promises`: Warning with void ignore
- `@typescript-eslint/no-misused-promises`: Error with specific void return handling

### Running Linting
```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Type checking (separate from linting)
npm run typecheck
```

### Project Structure Conventions
- **Components**: Vue SFCs in `components/` directory
- **Pages**: Nuxt pages in `pages/` directory
- **Composables**: Reusable logic in `composables/` directory
- **Stores**: Pinia stores in `stores/` directory
- **Types**: TypeScript definitions in `types/` directory
- **Server API**: Backend endpoints in `server/api/` directory

### Auto-imports
The project is configured to auto-import from:
- `./stores` - Pinia stores
- `./composables` - Vue composables
- `./types` - TypeScript types

## Development Best Practices

### Audio Implementation
- Use Howler.js for audio playback functionality
- Audio-related logic should be encapsulated in composables or stores

### State Management
- Use Pinia stores for global state management
- Player state management is centralized in the player store

### Styling
- Use Tailwind CSS utility classes
- Nuxt UI components are available project-wide
- Custom CSS should be added to `assets/css/main.css`

### API Integration
- Supabase client is auto-configured and available globally
- Server-side operations use service role key for admin functions
- Client-side operations use anon key with RLS policies

### Vue 3 Specific
- Use Composition API with `<script setup>` syntax
- Leverage auto-imports for Vue reactivity functions
- Use TypeScript for type safety

## Debugging Information

### Common Issues
1. **Supabase Connection**: Ensure environment variables are correctly set
2. **TypeScript Errors**: Run `npm run typecheck` to identify type issues
3. **Test Failures**: Check if tests directory exists and contains valid test files
4. **Build Failures**: Verify all dependencies are installed and environment variables are set

### Development Tools
- Nuxt DevTools are enabled in development mode
- Vue DevTools browser extension recommended
- ESLint and TypeScript extensions for your IDE

## AI-Friendly Development Principles

This project follows principles that make the codebase convenient for AI agents and automated tools.

### SOLID Principles

#### Single Responsibility Principle (SRP)
- Each Vue component should have a single, well-defined purpose
- Composables should handle one specific concern (e.g., `useAuth`, `usePlayer`)
- API endpoints should handle one specific operation
- Pinia stores should manage state for one domain area

#### Open/Closed Principle (OCP)
- Use Vue slots and props for extensibility without modification
- Design composables to be extensible through configuration objects
- Create plugin-based architectures where possible
- Use TypeScript interfaces to define contracts that can be extended

#### Liskov Substitution Principle (LSP)
- Ensure component props maintain consistent behavior across implementations
- API responses should follow consistent schemas regardless of implementation
- Composable functions should be interchangeable when implementing the same interface

#### Interface Segregation Principle (ISP)
- Define focused TypeScript interfaces for specific use cases
- Avoid large, monolithic prop interfaces in Vue components
- Create granular composables rather than large utility functions
- Split API endpoints into specific, focused operations

#### Dependency Inversion Principle (DIP)
- Depend on abstractions (TypeScript interfaces) rather than concrete implementations
- Use dependency injection patterns where applicable
- Abstract external services (Supabase) behind composables or service layers

### Code Quality Principles

#### KISS (Keep It Simple, Stupid)
- Prefer simple, readable code over clever solutions
- Use clear, descriptive variable and function names
- Avoid complex nested structures in templates and logic
- Choose straightforward Vue patterns over complex state management

#### DRY (Don't Repeat Yourself)
- Extract common functionality into composables
- Use Vue component composition for shared UI patterns
- Create utility functions for repeated logic
- Leverage TypeScript types and interfaces for consistency

### Machine Readability & Predictability

#### Structured Data Formats
- Use TypeScript interfaces for all data structures
- Implement consistent JSON schemas for API responses
- Define clear type definitions in `types/` directory
- Use Zod or similar for runtime schema validation

#### Deterministic Behavior
- Ensure functions return consistent outputs for identical inputs
- Avoid side effects in pure functions and composables
- Use immutable state patterns in Pinia stores
- Implement predictable error handling patterns

### API Design Standards

#### Clear and Stable Endpoints
- Follow RESTful conventions for API endpoints (`/api/v1/...`)
- Use consistent HTTP status codes (200, 201, 400, 401, 404, 500)
- Implement API versioning to prevent breaking changes
- Document all endpoints with clear request/response examples

#### Error Handling
- Return machine-readable error responses:
  ```json
  {
    "code": "INVALID_INPUT",
    "message": "Track title is required",
    "details": { "field": "title", "value": null }
  }
  ```
- Use consistent error codes across the application
- Implement proper HTTP status codes for different error types
- Provide actionable error messages

#### Idempotency
- Ensure POST/PUT operations can be safely retried
- Use unique identifiers for operations that should not be duplicated
- Implement proper state checking before mutations

### Observability & Debugging

#### Logging Standards
- Log all significant actions in structured JSON format
- Include request IDs for tracing operations
- Log both success and failure scenarios with context
- Use consistent log levels (debug, info, warn, error)

#### State Transparency
- Make application state easily inspectable via Vue DevTools
- Implement clear naming conventions for Pinia store actions
- Provide debugging information in development mode
- Use TypeScript to make data flow explicit

### Component Architecture

#### Predictable Component Behavior
- Use clear prop definitions with TypeScript types
- Implement consistent event naming conventions
- Follow Vue 3 Composition API patterns consistently
- Ensure components are self-contained and reusable

#### State Management
- Centralize global state in Pinia stores
- Use local state (ref/reactive) for component-specific data
- Implement clear CRUD operations for data management
- Avoid hidden side effects in state mutations

### Documentation & Discoverability

#### Self-Documenting Code
- Use TypeScript for implicit documentation
- Write descriptive JSDoc comments for complex functions
- Maintain consistent naming conventions
- Keep README and configuration files up-to-date

#### API Documentation
- Generate OpenAPI/Swagger documentation where possible
- Provide request/response examples for all endpoints
- Document rate limits and usage constraints
- Include error response examples

This project follows modern Vue.js and Nuxt.js best practices with a focus on type safety, testing, maintainable code architecture, and AI-friendly development patterns.
