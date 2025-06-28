#!/bin/bash

# Serverless Web App CDK Deployment Script

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
PROJECT_NAME=""
PROFILE=""
REGION=""
FORCE_DEPLOY=false

# Function to display help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deploy serverless web app using AWS CDK"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to deploy to (dev, staging, prod) [default: dev]"
    echo "  -p, --project PROJECT    Project name [required]"
    echo "  -r, --region REGION      AWS region [optional]"
    echo "  --profile PROFILE        AWS profile to use [optional]"
    echo "  -f, --force              Force deployment without confirmation"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -p my-app -e dev"
    echo "  $0 -p my-app -e prod --profile production"
    echo "  $0 -p my-app -e staging -r us-west-2 -f"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name is required${NC}"
    show_help
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Environment must be dev, staging, or prod${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting deployment for $PROJECT_NAME-$ENVIRONMENT${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}Error: AWS CDK is not installed${NC}"
    echo "Install with: npm install -g aws-cdk"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build CDK context parameters
CDK_CONTEXT=""
CDK_CONTEXT="$CDK_CONTEXT -c projectName=$PROJECT_NAME"
CDK_CONTEXT="$CDK_CONTEXT -c environment=$ENVIRONMENT"

if [ ! -z "$REGION" ]; then
    CDK_CONTEXT="$CDK_CONTEXT -c region=$REGION"
fi

# Set AWS profile if specified
if [ ! -z "$PROFILE" ]; then
    export AWS_PROFILE=$PROFILE
    echo -e "${BLUE}Using AWS profile: $PROFILE${NC}"
fi

# Show deployment details
echo -e "${BLUE}Deployment Details:${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Environment: $ENVIRONMENT"
if [ ! -z "$REGION" ]; then
    echo "  Region: $REGION"
fi
if [ ! -z "$PROFILE" ]; then
    echo "  AWS Profile: $PROFILE"
fi
echo ""

# Confirmation for production
if [ "$ENVIRONMENT" = "prod" ] && [ "$FORCE_DEPLOY" = false ]; then
    echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION!${NC}"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Bootstrap CDK if needed
echo -e "${BLUE}Checking CDK bootstrap...${NC}"
if ! cdk bootstrap $CDK_CONTEXT 2>/dev/null; then
    echo -e "${YELLOW}Bootstrapping CDK...${NC}"
    cdk bootstrap $CDK_CONTEXT
fi

# Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build

# Show diff if not forcing deployment
if [ "$FORCE_DEPLOY" = false ]; then
    echo -e "${BLUE}Showing deployment diff...${NC}"
    cdk diff $CDK_CONTEXT || true
    echo ""
    read -p "Continue with deployment? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Deploy
echo -e "${BLUE}Deploying to AWS...${NC}"
cdk deploy $CDK_CONTEXT --require-approval never

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}Stack outputs:${NC}"
cdk list $CDK_CONTEXT

echo ""
echo -e "${GREEN}🎉 Your serverless web app is now deployed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check the CloudFormation outputs for your API and website URLs"
echo "2. Upload your frontend assets to the S3 bucket"
echo "3. Test your API endpoints"
echo "4. Monitor your application in CloudWatch" 