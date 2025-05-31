#!/bin/bash

# Update system packages
sudo apt-get update

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js and npm installation
node --version
npm --version

# Navigate to workspace directory
cd /mnt/persist/workspace

# Install project dependencies
npm install

# Install Jest and testing dependencies
npm install --save-dev jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom

# Create Jest configuration file with correct property name
cat > jest.config.js << 'EOF'
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
EOF

# Create Jest setup file
cat > jest.setup.js << 'EOF'
import '@testing-library/jest-dom'
EOF

# Create a simple test file to verify setup
mkdir -p __tests__
cat > __tests__/utils.test.ts << 'EOF'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'hidden')
    expect(result).toBe('base conditional')
  })

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'valid')
    expect(result).toBe('base valid')
  })
})
EOF

# Create a test for React components
cat > __tests__/components.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })
})
EOF

# Add test script to package.json if it doesn't exist
if ! grep -q '"test"' package.json; then
  # Create a temporary file with the test script added
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.test = 'jest';
    pkg.scripts['test:watch'] = 'jest --watch';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  "
fi

# Add npm bin to PATH in user profile
echo 'export PATH="$PATH:./node_modules/.bin"' >> $HOME/.profile
echo 'export PATH="$PATH:$(npm bin)"' >> $HOME/.profile

# Source the profile to make PATH changes available
source $HOME/.profile

# Verify installation
npm list --depth=0