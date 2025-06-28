# Serverless Web App CDK Template

A comprehensive, reusable AWS CDK template for building production-ready serverless web applications with Lambda, API Gateway, DynamoDB/Aurora Serverless, and S3.

## Architecture Overview

This template creates a complete serverless architecture including:

- **API Layer**: AWS Lambda functions with API Gateway for RESTful endpoints
- **Database**: DynamoDB tables with GSI support or Aurora Serverless cluster
- **Static Assets**: S3 bucket with CloudFront distribution for global content delivery
- **Monitoring**: CloudWatch dashboards, X-Ray tracing, and log aggregation
- **Security**: IAM roles with least-privilege principles and encryption at rest

## Version Requirements

- **Node.js**: 18.x or 20.x (22.x supported with warnings)
- **npm**: 8.x or higher
- **AWS CLI**: 2.x (configured with appropriate credentials)
- **AWS CDK CLI**: 2.201.x or compatible version
- **TypeScript**: 5.7.x
- **AWS CDK Library**: 2.201.x

## Prerequisites and Setup

Before starting, ensure you have:

1. **Node.js and npm installed**
   ```bash
   node --version  # Should be 18.x, 20.x, or 22.x
   npm --version   # Should be 8.x or higher
   ```

2. **AWS CLI configured**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, region, and output format
   aws sts get-caller-identity  # Verify your credentials
   ```

3. **AWS CDK CLI installed globally**
   ```bash
   npm install -g aws-cdk@2.201.0
   cdk --version  # Should show 2.201.x
   ```

## Installation and Usage

### Step 1: Install Dependencies

Clone or download this template and install dependencies:

```bash
npm install
```

This will install:
- AWS CDK Library (2.201.0)
- TypeScript compiler and type definitions
- Jest for testing
- All required AWS service libraries

### Step 2: Bootstrap CDK (First Time Only)

If you haven't used CDK in your AWS account/region before:

```bash
cdk bootstrap
```

### Step 3: Configure Your Application

Edit `config/app-config.ts` to customize your application settings:

```typescript
export const defaultConfig: AppConfig = {
  projectName: 'your-project-name',  // REQUIRED: Change this
  environment: 'dev',                // dev, staging, prod
  
  database: {
    type: 'dynamodb',  // or 'aurora-serverless'
    dynamoTables: [
      {
        name: 'Users',
        partitionKey: 'userId',
        sortKey: 'createdAt',          // Optional
        gsi: [                         // Global Secondary Indexes
          {
            indexName: 'EmailIndex',
            partitionKey: 'email'
          }
        ]
      }
    ]
  },
  
  api: {
    stageName: 'api',
    throttle: {
      rateLimit: 1000,   // Requests per second
      burstLimit: 2000   // Burst capacity
    },
    cors: {
      allowOrigins: ['*'],  // Restrict in production
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization']
    }
  },
  
  lambda: {
    runtime: 'nodejs18.x',  // nodejs18.x, nodejs20.x
    timeout: 30,            // Seconds
    memorySize: 256         // MB
  },
  
  s3: {
    enableWebsiteHosting: true,
    enableCloudFront: true,
    customDomain: {         // Optional
      domainName: 'app.yourdomain.com',
      certificateArn: 'arn:aws:acm:...'
    }
  },
  
  monitoring: {
    enableXRay: true,
    enableCloudWatchLogs: true,
    logRetentionDays: 14
  }
};
```

### Step 4: Build and Validate

```bash
# Compile TypeScript
npm run build

# Generate CloudFormation template (dry run)
npm run synth

# Show what will be deployed
npm run diff
```

### Step 5: Deploy to AWS

```bash
# Deploy with default configuration
npm run deploy

# Deploy with custom context
cdk deploy -c projectName=my-app -c environment=prod

# Deploy using deployment script (with confirmation prompts)
./scripts/deploy.sh -p my-app -e dev

# Force deploy without prompts
./scripts/deploy.sh -p my-app -e prod -f
```

### Step 6: Access Your Application

After successful deployment, CloudFormation outputs will show:
- **API Gateway URL**: Base URL for REST API endpoints
- **Website URL**: CloudFront distribution URL for static website
- **S3 Bucket Name**: For uploading static assets
- **DynamoDB Table Names**: For direct database access

## Detailed Configuration Options

### Database Configuration

### DynamoDB Configuration (Recommended for most use cases)
```typescript
database: {
  type: 'dynamodb',
  dynamoTables: [
    {
      name: 'Users',
      partitionKey: 'userId',
      sortKey: 'createdAt',  // optional
      gsi: [  // Global Secondary Indexes
        {
          indexName: 'EmailIndex',
          partitionKey: 'email'
        }
      ]
    }
  ]
}
```

### Aurora Serverless Configuration (For complex relational data)
```typescript
database: {
  type: 'aurora-serverless',
  auroraConfig: {
    databaseName: 'myapp',
    masterUsername: 'admin',
    engine: 'postgres',  // or 'mysql'
    enableHttpEndpoint: true  // for Data API
  }
}
```

### API Gateway Configuration

```typescript
api: {
  stageName: 'api',
  throttle: {
    rateLimit: 1000,
    burstLimit: 2000
  },
  cors: {
    allowOrigins: ['https://mydomain.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization']
  }
}
```

### Static Assets Configuration

```typescript
s3: {
  enableWebsiteHosting: true,
  enableCloudFront: true,
  customDomain: {
    domainName: 'myapp.mydomain.com',
    certificateArn: 'arn:aws:acm:...'  // ACM certificate
  }
}
```

## Project Structure and Organization

```
├── bin/
│   └── app.ts                 # CDK app entry point
├── lib/
│   ├── constructs/           # Reusable CDK constructs
│   │   ├── database-construct.ts
│   │   ├── api-construct.ts
│   │   ├── s3-construct.ts
│   │   └── monitoring-construct.ts
│   └── serverless-webapp-stack.ts
├── config/
│   └── app-config.ts         # Configuration file
├── lambda/                   # Lambda function source code
│   └── handlers/             # Sample Lambda handlers
├── examples/                 # Example configurations
├── scripts/                  # Deployment and setup scripts
├── package.json
├── tsconfig.json
└── cdk.json
```

## Development Workflow and Commands

### Available npm Scripts

```bash
# Development commands
npm run build         # Compile TypeScript to JavaScript
npm run watch         # Watch for changes and auto-compile
npm run synth         # Generate CloudFormation template
npm run diff          # Show changes that will be deployed
npm run deploy        # Build and deploy to AWS
npm run destroy       # Delete all AWS resources

# Testing commands
npm test              # Run Jest unit tests
npm run test:watch    # Run tests in watch mode
```

### CDK Commands

```bash
# Basic CDK operations
cdk list              # List all stacks in the app
cdk synth             # Synthesize CloudFormation template
cdk diff              # Compare deployed stack with current state
cdk deploy            # Deploy stack to AWS
cdk destroy           # Delete stack from AWS

# Advanced operations
cdk bootstrap         # Deploy CDK toolkit stack
cdk context           # Manage context values
cdk doctor            # Check for potential issues
```

### Environment Management

Deploy to different environments by setting context values:

```bash
# Development environment
cdk deploy -c projectName=myapp -c environment=dev

# Staging environment  
cdk deploy -c projectName=myapp -c environment=staging

# Production environment
cdk deploy -c projectName=myapp -c environment=prod

# Custom region
cdk deploy -c projectName=myapp -c environment=prod -c region=us-west-2
```

### Local Development Workflow

1. **Modify Lambda Functions**: 
   - Update inline code in `lib/constructs/api-construct.ts`
   - Or create separate files in `lambda/handlers/`

2. **Update Database Schema**: 
   - Modify table definitions in `config/app-config.ts`
   - Add new GSI indexes or change partition/sort keys

3. **Test Changes Locally**:
   ```bash
   npm run build        # Check for compilation errors
   npm run synth        # Validate CloudFormation template
   npm run diff         # Preview changes
   ```

4. **Deploy Changes**:
   ```bash
   npm run deploy       # Deploy to AWS
   ```

### Monitoring and Debugging

The template includes comprehensive monitoring:

- **CloudWatch Dashboard**: Automatically created with API Gateway and Lambda metrics
- **X-Ray Tracing**: Enabled by default for distributed tracing
- **CloudWatch Logs**: Centralized logging with configurable retention
- **Custom Metrics**: Lambda duration, invocations, and error rates

Access monitoring:
```bash
# View logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/your-project

# View X-Ray traces  
aws xray get-trace-summaries --time-range-type TimeRangeByStartTime
```

## Security Features and Best Practices

- **IAM Roles**: Least-privilege principle applied
- **VPC**: Aurora Serverless deployed in private subnets
- **Encryption**: DynamoDB and S3 encryption enabled
- **CORS**: Configurable CORS policies
- **CloudFront**: Optional CDN with HTTPS enforcement

## API Endpoints and Usage

The template creates these example endpoints:

- `GET /api/items` - List all items
- `POST /api/items` - Create a new item
- `GET /api/items/{id}` - Get specific item
- `PUT /api/items/{id}` - Update specific item
- `DELETE /api/items/{id}` - Delete specific item
- `GET /api/users` - List all users
- `POST /api/users` - Create a new user
- `GET /api/users/{id}` - Get specific user

## Customization and Extension Guide

### Adding New Lambda Functions

1. **Update API Construct**: Add new function configs in `api-construct.ts`
2. **Add Routes**: Define new API Gateway routes
3. **Set Permissions**: Configure IAM permissions for database access

### Extending Database Schema

#### Adding DynamoDB Tables
```typescript
// Add to config/app-config.ts
dynamoTables: [
  {
    name: 'Products',
    partitionKey: 'productId',
    sortKey: 'category',
    gsi: [
      {
        indexName: 'CategoryIndex',
        partitionKey: 'category',
        sortKey: 'price'
      }
    ]
  }
]
```

#### Using Aurora Serverless
Aurora Serverless v1 provides automatic scaling and pay-per-use pricing. Use the RDS Data API for HTTP-based database access without connection pooling.

### Custom Domains

1. **Create ACM Certificate** in AWS Console
2. **Update Configuration**:
```typescript
s3: {
  enableCloudFront: true,
  customDomain: {
    domainName: 'app.yourdomain.com',
    certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/...'
  }
}
```

## Testing and Validation

```bash
# Run tests
npm test

# Check CDK diff before deployment
npm run diff

# Validate CloudFormation template
npm run synth
```

## Resource Cleanup and Cost Management

```bash
# Destroy all resources
npm run destroy

# Or use CDK directly
cdk destroy

# Force destroy without confirmation
cdk destroy --force
```

**Important**: This will delete all resources including:
- Lambda functions and API Gateway
- DynamoDB tables (data will be lost unless retention is enabled)
- S3 buckets and CloudFront distributions
- CloudWatch logs and dashboards

Production environments have retention policies that may prevent deletion of certain resources.

## Common Use Cases and Examples

### 1. REST API with Database
- Use DynamoDB for simple key-value operations
- Use Aurora Serverless for complex relational queries

### 2. Static Website with API Backend
- S3 + CloudFront for frontend
- Lambda + API Gateway for backend

### 3. Multi-tenant SaaS Application
- Configure separate DynamoDB tables per tenant
- Use Lambda environment variables for tenant isolation

## Troubleshooting

### Common Issues

**CDK Version Mismatch**
```bash
# Update CDK CLI to match library version
npm install -g aws-cdk@2.201.0

# Check versions
cdk --version
npm list aws-cdk-lib
```

**Node.js Version Warnings**
The template supports Node.js 18.x and 20.x. Node.js 22.x will show warnings but should work.

**AWS Credentials Issues**
```bash
# Verify credentials
aws sts get-caller-identity

# Configure if needed
aws configure
```

**Bootstrap Issues**
```bash
# Re-bootstrap if needed
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Getting Help

- Check AWS CDK documentation: https://docs.aws.amazon.com/cdk/
- Review CloudFormation events in AWS Console
- Enable debug logging: `cdk deploy --debug`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Template Information

### Version History
- **v1.0.0**: Initial release with DynamoDB, Aurora Serverless, S3, and monitoring
- **CDK Version**: 2.201.0
- **Node.js Support**: 18.x, 20.x, 22.x (with warnings)

### Dependencies
- aws-cdk-lib: ^2.201.0
- constructs: ^10.4.2
- typescript: ^5.7.2

### License

MIT License - see LICENSE file for details.

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)

## Support

For issues, questions, or contributions, please refer to:
- AWS CDK GitHub repository
- AWS Developer Documentation
- CloudFormation User Guide

This template is designed for production use with AWS best practices for security, scalability, and cost optimization. 