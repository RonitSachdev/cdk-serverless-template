import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { DatabaseConstruct } from './database-construct';
import { AppConfig } from '../../config/app-config';

export interface ApiConstructProps {
  config: AppConfig['api'];
  lambdaConfig: AppConfig['lambda'];
  projectName: string;
  environment: string;
  database: DatabaseConstruct;
}

export class ApiConstruct extends Construct {
  public readonly restApi: apigateway.RestApi;
  public readonly lambdaFunctions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { config, lambdaConfig, projectName, environment, database } = props;

    // Create API Gateway
    this.restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${projectName}-${environment}-api`,
      description: `API for ${projectName} ${environment}`,
      defaultCorsPreflightOptions: config.cors ? {
        allowOrigins: config.cors.allowOrigins,
        allowMethods: config.cors.allowMethods,
        allowHeaders: config.cors.allowHeaders,
      } : undefined,
      deployOptions: {
        stageName: config.stageName,
        throttlingRateLimit: config.throttle?.rateLimit,
        throttlingBurstLimit: config.throttle?.burstLimit,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      cloudWatchRole: true,
    });

    // Create Lambda execution role
    const lambdaRole = this.createLambdaExecutionRole(database);

    // Create Lambda functions
    this.createLambdaFunctions(lambdaConfig, projectName, environment, lambdaRole, database);

    // Setup API routes
    this.setupApiRoutes();
  }

  private createLambdaExecutionRole(database: DatabaseConstruct): iam.Role {
    const role = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
    });

    // Add DynamoDB permissions
    if (database.dynamoTables) {
      Object.values(database.dynamoTables).forEach((table) => {
        table.grantReadWriteData(role);
      });
    }

    // Add Aurora permissions
    if (database.auroraCluster) {
      role.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds-data:ExecuteStatement',
          'rds-data:BatchExecuteStatement',
          'rds-data:BeginTransaction',
          'rds-data:CommitTransaction',
          'rds-data:RollbackTransaction',
        ],
        resources: [database.auroraCluster.clusterArn],
      }));

      if (database.auroraSecret) {
        database.auroraSecret.grantRead(role);
      }
    }

    return role;
  }

  private createLambdaFunctions(
    lambdaConfig: AppConfig['lambda'],
    projectName: string,
    environment: string,
    role: iam.Role,
    database: DatabaseConstruct
  ) {
    // Common Lambda environment variables
    const commonEnvironment: { [key: string]: string } = {
      PROJECT_NAME: projectName,
      ENVIRONMENT: environment,
      DATABASE_TYPE: database.dynamoTables ? 'dynamodb' : 'aurora-serverless',
    };

    // Add DynamoDB table names to environment
    if (database.dynamoTables) {
      Object.entries(database.dynamoTables).forEach(([name, table]) => {
        commonEnvironment[`DYNAMODB_TABLE_${name.toUpperCase()}`] = table.tableName;
      });
    }

    // Add Aurora connection info to environment
    if (database.auroraCluster && database.auroraSecret) {
      commonEnvironment.AURORA_CLUSTER_ARN = database.auroraCluster.clusterArn;
      commonEnvironment.AURORA_SECRET_ARN = database.auroraSecret.secretArn;
    }

    // Create individual Lambda functions
    const functionConfigs = [
      { name: 'GetItems', method: 'GET', path: '/items' },
      { name: 'CreateItem', method: 'POST', path: '/items' },
      { name: 'GetItem', method: 'GET', path: '/items/{id}' },
      { name: 'UpdateItem', method: 'PUT', path: '/items/{id}' },
      { name: 'DeleteItem', method: 'DELETE', path: '/items/{id}' },
      { name: 'GetUsers', method: 'GET', path: '/users' },
      { name: 'CreateUser', method: 'POST', path: '/users' },
      { name: 'GetUser', method: 'GET', path: '/users/{id}' },
    ];

    functionConfigs.forEach((config) => {
      this.lambdaFunctions[config.name] = new lambda.Function(this, `${config.name}Function`, {
        functionName: `${projectName}-${environment}-${config.name.toLowerCase()}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(this.getDefaultLambdaCode(config.name)),
        role,
        timeout: cdk.Duration.seconds(lambdaConfig.timeout),
        memorySize: lambdaConfig.memorySize,
        environment: commonEnvironment,
        tracing: lambda.Tracing.ACTIVE,
        logRetention: logs.RetentionDays.TWO_WEEKS,
      });
    });
  }

  private setupApiRoutes() {
    // Items resource
    const itemsResource = this.restApi.root.addResource('items');
    itemsResource.addMethod('GET', new apigateway.LambdaIntegration(this.lambdaFunctions.GetItems));
    itemsResource.addMethod('POST', new apigateway.LambdaIntegration(this.lambdaFunctions.CreateItem));

    const itemResource = itemsResource.addResource('{id}');
    itemResource.addMethod('GET', new apigateway.LambdaIntegration(this.lambdaFunctions.GetItem));
    itemResource.addMethod('PUT', new apigateway.LambdaIntegration(this.lambdaFunctions.UpdateItem));
    itemResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.lambdaFunctions.DeleteItem));

    // Users resource
    const usersResource = this.restApi.root.addResource('users');
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(this.lambdaFunctions.GetUsers));
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(this.lambdaFunctions.CreateUser));

    const userResource = usersResource.addResource('{id}');
    userResource.addMethod('GET', new apigateway.LambdaIntegration(this.lambdaFunctions.GetUser));
  }

  private getDefaultLambdaCode(functionName: string): string {
    return `
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({
            message: 'Hello from ${functionName}!',
            function: '${functionName}',
            environment: process.env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
            event: event,
        }),
    };
    
    return response;
};
`;
  }
} 