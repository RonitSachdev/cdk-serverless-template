import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AppConfig } from '../config/app-config';
import { DatabaseConstruct } from './constructs/database-construct';
import { ApiConstruct } from './constructs/api-construct';
import { S3Construct } from './constructs/s3-construct';
import { MonitoringConstruct } from './constructs/monitoring-construct';

export interface ServerlessWebAppStackProps extends cdk.StackProps {
  config: AppConfig;
}

export class ServerlessWebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServerlessWebAppStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Database Layer (DynamoDB or Aurora Serverless)
    const database = new DatabaseConstruct(this, 'Database', {
      config: config.database,
      projectName: config.projectName,
      environment: config.environment,
    });

    // API Layer (Lambda + API Gateway)
    const api = new ApiConstruct(this, 'Api', {
      config: config.api,
      lambdaConfig: config.lambda,
      projectName: config.projectName,
      environment: config.environment,
      database: database,
    });

    // Static Assets (S3 + CloudFront)
    const s3 = new S3Construct(this, 'S3', {
      config: config.s3,
      projectName: config.projectName,
      environment: config.environment,
    });

    // Monitoring (optional)
    if (config.monitoring) {
      new MonitoringConstruct(this, 'Monitoring', {
        config: config.monitoring,
        projectName: config.projectName,
        environment: config.environment,
        api: api,
        lambdaFunctions: api.lambdaFunctions,
      });
    }

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.restApi.url,
      description: 'API Gateway URL',
    });

    if (config.s3.enableWebsiteHosting) {
      new cdk.CfnOutput(this, 'WebsiteUrl', {
        value: s3.websiteUrl || 'Not configured',
        description: 'Website URL',
      });
    }

    if (s3.distributionDomainName) {
      new cdk.CfnOutput(this, 'CloudFrontUrl', {
        value: `https://${s3.distributionDomainName}`,
        description: 'CloudFront Distribution URL',
      });
    }

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: s3.bucket.bucketName,
      description: 'S3 Bucket Name for static assets',
    });

    // Database outputs
    if (config.database.type === 'dynamodb' && database.dynamoTables) {
      Object.entries(database.dynamoTables).forEach(([name, table]) => {
        new cdk.CfnOutput(this, `DynamoTable${name}`, {
          value: table.tableName,
          description: `DynamoDB Table: ${name}`,
        });
      });
    }

    if (config.database.type === 'aurora-serverless' && database.auroraCluster) {
      new cdk.CfnOutput(this, 'AuroraClusterEndpoint', {
        value: database.auroraCluster.clusterEndpoint.socketAddress,
        description: 'Aurora Serverless Cluster Endpoint',
      });
    }
  }
} 