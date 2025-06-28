#!/bin/bash

# Serverless Web App CDK Setup Script

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Serverless Web App CDK Template${NC}"
echo ""

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version 18+ is required (current: $(node -v))${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Check if AWS CLI is installed
echo ""
echo -e "${BLUE}Checking AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CLI is not installed${NC}"
    echo "Please install AWS CLI from https://aws.amazon.com/cli/"
    echo "And configure it with: aws configure"
else
    echo -e "${GREEN}✅ AWS CLI $(aws --version | cut -d' ' -f1) detected${NC}"
    
    # Check if AWS is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${YELLOW}⚠️  AWS CLI is not configured${NC}"
        echo "Please configure AWS CLI with: aws configure"
    else
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        AWS_REGION=$(aws configure get region || echo "not set")
        echo -e "${GREEN}✅ AWS configured (Account: $AWS_ACCOUNT, Region: $AWS_REGION)${NC}"
    fi
fi

# Check if CDK is installed
echo ""
echo -e "${BLUE}Checking AWS CDK...${NC}"
if ! command -v cdk &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CDK is not installed${NC}"
    read -p "Would you like to install AWS CDK globally? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}Installing AWS CDK...${NC}"
        npm install -g aws-cdk
        echo -e "${GREEN}✅ AWS CDK installed${NC}"
    fi
else
    echo -e "${GREEN}✅ AWS CDK $(cdk --version) detected${NC}"
fi

# Build the project
echo ""
echo -e "${BLUE}Building the project...${NC}"
npm run build

# Create example configuration if it doesn't exist
if [ ! -f "config/my-config.ts" ]; then
    echo ""
    echo -e "${BLUE}Creating example configuration...${NC}"
    cat > config/my-config.ts << 'EOF'
import { AppConfig } from './app-config';

// Customize this configuration for your project
export const myConfig: AppConfig = {
  projectName: 'my-awesome-app',  // Change this!
  environment: 'dev',
  
  database: {
    type: 'dynamodb',
    dynamoTables: [
      {
        name: 'Users',
        partitionKey: 'userId',
        gsi: [
          {
            indexName: 'EmailIndex',
            partitionKey: 'email'
          }
        ]
      },
      {
        name: 'Items',
        partitionKey: 'id',
        sortKey: 'createdAt'
      }
    ]
  },
  
  api: {
    stageName: 'api',
    throttle: {
      rateLimit: 1000,
      burstLimit: 2000
    },
    cors: {
      allowOrigins: ['*'],  // Restrict this in production
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization']
    }
  },
  
  lambda: {
    runtime: 'nodejs18.x',
    timeout: 30,
    memorySize: 256
  },
  
  s3: {
    enableWebsiteHosting: true,
    enableCloudFront: true
  },
  
  monitoring: {
    enableXRay: true,
    enableCloudWatchLogs: true,
    logRetentionDays: 14
  }
};
EOF
    echo -e "${GREEN}✅ Example configuration created at config/my-config.ts${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit config/app-config.ts to customize your project"
echo "2. Customize the Lambda functions in lambda/handlers/"
echo "3. Deploy with: npm run deploy"
echo "   Or use: ./scripts/deploy.sh -p your-project-name -e dev"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  npm run build        - Build the TypeScript code"
echo "  npm run synth        - Generate CloudFormation template"
echo "  npm run deploy       - Deploy to AWS"
echo "  npm run diff         - Show deployment diff"
echo "  npm run destroy      - Delete all resources"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  See README.md for detailed usage instructions"
echo "  Check examples/ folder for configuration examples"
echo ""
echo -e "${YELLOW}Don't forget to customize config/app-config.ts before deploying!${NC}" 