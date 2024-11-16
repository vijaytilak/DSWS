# DataSphere Components Structure

## Core Components

### Layout Components
- `app-sidebar.tsx`: Main application sidebar with navigation
- `nav-main.tsx`: Main navigation component used within the sidebar
- `sidebar-opt-in-form.tsx`: Newsletter subscription form in the sidebar

### Authentication Components (`/auth`)
- `protected-route.tsx`: HOC for protecting authenticated routes
- `login-form.tsx`: Login form with email/password authentication

### Providers (`/providers`)
- `auth-provider.tsx`: Global authentication state provider

### UI Components (`/ui`)
Shadcn UI components:
- `button.tsx`
- `card.tsx`
- `dropdown-menu.tsx`
- `input.tsx`
- `label.tsx`
- `separator.tsx`
- `sheet.tsx`
- `sidebar.tsx`
- `skeleton.tsx`
- `toast.tsx`
- `toaster.tsx`
- `tooltip.tsx`

## Component Dependencies

### Sidebar System
The sidebar system consists of three main components that work together:
1. `app-sidebar.tsx`: Container component
2. `nav-main.tsx`: Navigation menu implementation
3. `sidebar-opt-in-form.tsx`: Optional form component

### Authentication System
The authentication system uses:
1. `auth-provider.tsx`: Global state management
2. `protected-route.tsx`: Route protection
3. `login-form.tsx`: User authentication interface

## Best Practices
1. Keep components focused and single-responsibility
2. Use TypeScript for type safety
3. Implement proper error handling
4. Follow the "client"/"server" component pattern
5. Keep UI components separate from business logic

## Adding New Components
When adding new components:
1. Place them in the appropriate directory based on their purpose
2. Use proper TypeScript types
3. Add "use client" directive if the component uses hooks or browser APIs
4. Update this documentation when adding major components
