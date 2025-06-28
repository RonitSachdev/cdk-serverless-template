import { AppConfig } from '../config/app-config';

// Example 1: Simple blog API with DynamoDB
export const blogApiConfig: AppConfig = {
  projectName: 'blog-api',
  environment: 'dev',
  
  database: {
    type: 'dynamodb',
    dynamoTables: [
      {
        name: 'Posts',
        partitionKey: 'postId',
        sortKey: 'createdAt',
        gsi: [
          {
            indexName: 'AuthorIndex',
            partitionKey: 'authorId',
            sortKey: 'createdAt'
          },
          {
            indexName: 'CategoryIndex',
            partitionKey: 'category',
            sortKey: 'createdAt'
          }
        ]
      },
      {
        name: 'Authors',
        partitionKey: 'authorId',
        gsi: [
          {
            indexName: 'EmailIndex',
            partitionKey: 'email'
          }
        ]
      },
      {
        name: 'Comments',
        partitionKey: 'commentId',
        sortKey: 'postId',
        gsi: [
          {
            indexName: 'PostCommentsIndex',
            partitionKey: 'postId',
            sortKey: 'createdAt'
          }
        ]
      }
    ]
  },
  
  api: {
    stageName: 'v1',
    throttle: {
      rateLimit: 500,
      burstLimit: 1000
    },
    cors: {
      allowOrigins: ['https://myblog.com', 'http://localhost:3000'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },
  
  lambda: {
    runtime: 'nodejs18.x',
    timeout: 30,
    memorySize: 512
  },
  
  s3: {
    enableWebsiteHosting: true,
    enableCloudFront: true,
    customDomain: {
      domainName: 'blog.mydomain.com'
    }
  },
  
  monitoring: {
    enableXRay: true,
    enableCloudWatchLogs: true,
    logRetentionDays: 30
  }
};

// Example 2: E-commerce API with Aurora Serverless
export const ecommerceConfig: AppConfig = {
  projectName: 'ecommerce-api',
  environment: 'prod',
  
  database: {
    type: 'aurora-serverless',
    auroraConfig: {
      databaseName: 'ecommerce',
      masterUsername: 'admin',
      engine: 'postgres',
      enableHttpEndpoint: true
    }
  },
  
  api: {
    stageName: 'v2',
    throttle: {
      rateLimit: 2000,
      burstLimit: 5000
    },
    cors: {
      allowOrigins: ['https://shop.mydomain.com'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }
  },
  
  lambda: {
    runtime: 'nodejs20.x',
    timeout: 60,
    memorySize: 1024
  },
  
  s3: {
    enableWebsiteHosting: true,
    enableCloudFront: true,
    customDomain: {
      domainName: 'shop.mydomain.com',
      certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-...'
    }
  },
  
  monitoring: {
    enableXRay: true,
    enableCloudWatchLogs: true,
    logRetentionDays: 90
  }
};

// Example 3: Simple CRUD API with minimal configuration
export const simpleCrudConfig: AppConfig = {
  projectName: 'simple-crud',
  environment: 'dev',
  
  database: {
    type: 'dynamodb',
    dynamoTables: [
      {
        name: 'Items',
        partitionKey: 'id'
      }
    ]
  },
  
  api: {
    stageName: 'api'
  },
  
  lambda: {
    runtime: 'nodejs18.x',
    timeout: 15,
    memorySize: 128
  },
  
  s3: {
    enableWebsiteHosting: false
  }
};

// Example 4: Multi-tenant SaaS application
export const saasConfig: AppConfig = {
  projectName: 'saas-platform',
  environment: 'prod',
  
  database: {
    type: 'dynamodb',
    dynamoTables: [
      {
        name: 'Tenants',
        partitionKey: 'tenantId',
        gsi: [
          {
            indexName: 'DomainIndex',
            partitionKey: 'domain'
          }
        ]
      },
      {
        name: 'Users',
        partitionKey: 'userId',
        sortKey: 'tenantId',
        gsi: [
          {
            indexName: 'TenantUsersIndex',
            partitionKey: 'tenantId',
            sortKey: 'email'
          },
          {
            indexName: 'EmailIndex',
            partitionKey: 'email'
          }
        ]
      },
      {
        name: 'TenantData',
        partitionKey: 'tenantId',
        sortKey: 'dataType#entityId'
      }
    ]
  },
  
  api: {
    stageName: 'v1',
    throttle: {
      rateLimit: 5000,
      burstLimit: 10000
    },
    cors: {
      allowOrigins: ['*'], // Will be restricted per tenant in code
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
    }
  },
  
  lambda: {
    runtime: 'nodejs20.x',
    timeout: 45,
    memorySize: 512
  },
  
  s3: {
    enableWebsiteHosting: true,
    enableCloudFront: true
  },
  
  monitoring: {
    enableXRay: true,
    enableCloudWatchLogs: true,
    logRetentionDays: 365
  }
}; 