// This file contains any setup code that should run before Jest runs tests
// For example, you might want to set up global mocks or extend Jest's expect

// Mock the window.matchMedia function which is often needed for UI component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Add any other global mocks or setup here
