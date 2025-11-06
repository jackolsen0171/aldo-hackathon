# Technology Stack

## Frontend
- **React 19.2.0** - Main UI framework
- **Create React App** - Build toolchain and development environment
- **CSS** - Styling (App.css, index.css)
- **React Testing Library** - Testing framework
- **Web Vitals** - Performance monitoring

## Backend/AI Integration
- **Python** - Backend scripting language
- **AWS Bedrock** - AI/ML service integration
- **boto3** - AWS SDK for Python
- **Amazon Nova Lite v1:0** - AI model

## Build System
- **react-scripts** - Handles build, test, and development server
- **npm** - Package manager

## Common Commands

### Development
```bash
npm start          # Start development server (http://localhost:3000)
npm test           # Run tests in watch mode
npm run build      # Build for production
```

### Python Environment
```bash
# Activate virtual environment (if using aldo_venv)
source aldo_venv/bin/activate
```

## Configuration
- ESLint configured with react-app preset
- Browserslist configured for modern browsers
- AWS credentials required for Bedrock integration