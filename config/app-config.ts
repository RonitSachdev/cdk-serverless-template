export interface DatabaseConfig {
  type: 'dynamodb' | 'aurora-serverless';
  // DynamoDB specific config
  dynamoTables?: {
    name: string;
    partitionKey: string;
    sortKey?: string;
    gsi?: {
      indexName: string;
      partitionKey: string;
      sortKey?: string;
    }[];
  }[];
  // Aurora specific config
  auroraConfig?: {
    databaseName: string;
    masterUsername: string;
    engine: 'mysql' | 'postgres';
    enableHttpEndpoint?: boolean;
  };
}

export interface AppConfig {
  // Project identification
  projectName: string;
  environment: string;
  
  // AWS specific
  account?: string;
  region?: string;
  
  // Database configuration
  database: DatabaseConfig;
  
  // API Configuration
  api: {
    stageName: string;
    throttle?: {
      rateLimit: number;
      burstLimit: number;
    };
    cors?: {
      allowOrigins: string[];
      allowMethods: string[];
      allowHeaders: string[];
    };
  };
  
  // Lambda configuration
  lambda: {
    runtime: 'nodejs18.x' | 'nodejs20.x' | 'python3.9' | 'python3.10' | 'python3.11';
    timeout: number; // in seconds
    memorySize: number; // in MB
  };
  
  // S3 configuration
  s3: {
    enableWebsiteHosting: boolean;
    enableCloudFront?: boolean;
    customDomain?: {
      domainName: string;
      certificateArn?: string;
    };
  };
  
  // Monitoring
  monitoring?: {
    enableXRay: boolean;
    enableCloudWatchLogs: boolean;
    logRetentionDays: number;
  };
}

// Default configuration - customize this for your project
export const defaultConfig: AppConfig = {
  projectName: 'my-serverless-app',
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
      allowOrigins: ['*'],
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