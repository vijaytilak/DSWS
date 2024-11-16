# DataSphere Pages Structure

## Page Organization

### Root Level (`/app`)
- `layout.tsx`: Root layout with authentication provider
- `page.tsx`: Landing page
- `globals.css`: Global styles

### Authentication Pages (`/app/login`)
- `page.tsx`: Login page with email/password authentication

### Dashboard (`/app/dashboard`)
- `layout.tsx`: Protected dashboard layout
- `page.tsx`: Main dashboard view

## Current Routing Structure

```
/                   # Landing page
├── /login          # Authentication
└── /dashboard      # Protected dashboard area
    ├── /analytics     # (planned)
    └── /visualizations # (planned)
```

## Page Responsibilities

### Landing Page (`/app/page.tsx`)
- Entry point for the application
- Redirects to appropriate section based on auth state

### Login Page (`/app/login/page.tsx`)
- Handles user authentication
- Provides login form
- Manages authentication state

### Dashboard Page (`/app/dashboard/page.tsx`)
- Protected by authentication
- Displays data visualization and analytics
- Provides navigation to different dashboard sections

## Best Practices for Pages

1. Page Organization:
   - Keep pages simple and focused
   - Use layouts for shared UI elements
   - Implement proper loading and error states

2. Authentication:
   - All dashboard routes are protected
   - Implement proper redirects
   - Handle authentication state changes

3. Data Fetching:
   - Use server components where possible
   - Implement proper loading states
   - Handle errors gracefully

4. Performance:
   - Optimize component rendering
   - Implement proper data caching
   - Use dynamic imports for large components

5. Default Page Layout:
   - The default layout should be the same across all pages except for login - Refer to Dashboard Layout. It should have a sidebar and a header using the same Shadcn UI components used by Dashboard Layout.

## Adding New Pages

When adding new pages:
1. Follow the established directory structure
2. Implement proper authentication if needed
3. Add loading and error states
4. Update this documentation
5. Consider the impact on navigation and routing
