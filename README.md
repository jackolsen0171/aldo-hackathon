# AI-Powered Weather Chat Application

This is a frontend-only React application that provides AI-powered weather information through conversational chat. The application integrates directly with AWS Bedrock for AI capabilities and OpenWeatherMap for weather data, eliminating the need for a backend server.

## Features

- **AI-Powered Conversations**: Direct integration with AWS Bedrock (Amazon Nova Lite model) for natural language processing
- **Weather Information**: Real-time weather data and forecasts via OpenWeatherMap API
- **Frontend-Only Architecture**: Runs entirely in the browser with no backend server required
- **Responsive Design**: Modern React-based user interface with error handling and loading states

## Technology Stack

- **React 19.2.0** - Main UI framework
- **AWS Bedrock** - AI/ML service integration via AWS SDK
- **OpenWeatherMap API** - Weather data provider
- **Create React App** - Build toolchain and development environment
- **React Testing Library** - Testing framework

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Prerequisites

Before running the application, you'll need:

1. **AWS Account** with Bedrock access
2. **OpenWeatherMap API Key** (free tier available)
3. **Node.js** (version 14 or higher)
4. **npm** package manager

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables in `.env`:
   ```bash
   # AWS Configuration for Bedrock integration
   REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_here
   REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key_here
   REACT_APP_AWS_REGION=us-east-1

   # Weather API Configuration
   REACT_APP_WEATHER_API_KEY=your_openweather_api_key_here
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The application will start immediately with the chat interface ready to use. Make sure your environment variables are configured correctly for AWS Bedrock and weather API access.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in interactive watch mode.\
Tests include unit tests for services, components, and integration tests for the complete chat flow.

See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed to any static hosting service!

**Deployment Options:**
- **Netlify**: Drag and drop the `build` folder
- **Vercel**: Connect your Git repository for automatic deployments
- **AWS S3 + CloudFront**: Host as a static website
- **GitHub Pages**: Use the built-in GitHub Pages deployment

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Application Architecture

This application uses a **frontend-only architecture** with the following key components:

### Service Layer
- **ChatService** (`src/services/chatService.js`) - Main orchestration layer for user interactions
- **BedrockService** (`src/services/bedrockService.js`) - Direct AWS Bedrock integration for AI capabilities
- **WeatherService** (`src/services/weatherService.js`) - OpenWeatherMap API integration

### React Components
- **ChatWidget** (`src/components/ChatWidget.js`) - Main chat interface
- **MessageList** (`src/components/MessageList.js`) - Conversation display
- **ErrorBoundary** (`src/components/ErrorBoundary.js`) - Error handling

### Data Flow
1. User enters message in ChatWidget
2. ChatService orchestrates the request
3. BedrockService processes AI interactions
4. WeatherService fetches weather data when needed
5. Response is displayed in MessageList

## Usage

1. Start the application with `npm start`
2. Open your browser to [http://localhost:3000](http://localhost:3000)
3. Type weather-related questions like:
   - "What's the weather like in New York?"
   - "Will it rain tomorrow in London?"
   - "Show me the forecast for Paris this week"

The AI assistant will understand your request and provide detailed weather information with natural language responses.

## Troubleshooting

### Common Issues

**AWS Bedrock Access Denied**
- Ensure your AWS credentials have Bedrock permissions
- Verify the AWS region supports Bedrock services
- Check that your access keys are correctly configured

**Weather API Errors**
- Verify your OpenWeatherMap API key is valid
- Check that you haven't exceeded your API quota
- Ensure the API key is properly set in your `.env` file

**Application Won't Start**
- Run `npm install` to ensure all dependencies are installed
- Check that all required environment variables are set
- Verify Node.js version is 14 or higher

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Project Structure

```
src/
├── components/          # React UI components
│   ├── ChatWidget.js   # Main chat interface
│   ├── MessageList.js  # Message display component
│   └── ErrorBoundary.js # Error handling component
├── services/           # Business logic and API integration
│   ├── chatService.js  # Main orchestration service
│   ├── bedrockService.js # AWS Bedrock AI integration
│   └── weatherService.js # Weather API integration
├── hooks/              # Custom React hooks
│   └── useChat.js      # Chat functionality hook
├── App.js              # Main application component
└── index.js            # Application entry point
```

## Security Considerations

- **AWS Credentials**: Store securely and rotate regularly
- **API Keys**: Use environment variables and domain restrictions
- **Client-Side Security**: All API calls are made directly from the browser

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [OpenWeatherMap API Documentation](https://openweathermap.org/api)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
