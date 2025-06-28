import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { DatabaseConfig } from '../../config/app-config';

export interface DatabaseConstructProps {
  config: DatabaseConfig;
  projectName: string;
  environment: string;
}

export class DatabaseConstruct extends Construct {
  public dynamoTables?: { [key: string]: dynamodb.Table };
  public auroraCluster?: rds.ServerlessCluster;
  public auroraSecret?: secretsmanager.Secret;
  public vpc?: ec2.Vpc;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const { config, projectName, environment } = props;

    if (config.type === 'dynamodb') {
      this.setupDynamoDB(config, projectName, environment);
    } else if (config.type === 'aurora-serverless') {
      this.setupAuroraServerless(config, projectName, environment);
    }
  }

  private setupDynamoDB(config: DatabaseConfig, projectName: string, environment: string) {
    if (!config.dynamoTables) return;

    this.dynamoTables = {};

    config.dynamoTables.forEach((tableConfig) => {
      const table = new dynamodb.Table(this, `${tableConfig.name}Table`, {
        tableName: `${projectName}-${environment}-${tableConfig.name}`,
        partitionKey: {
          name: tableConfig.partitionKey,
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: tableConfig.sortKey ? {
          name: tableConfig.sortKey,
          type: dynamodb.AttributeType.STRING,
        } : undefined,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        pointInTimeRecovery: environment === 'prod',
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
      });

      // Add Global Secondary Indexes
      if (tableConfig.gsi) {
        tableConfig.gsi.forEach((gsiConfig, index) => {
          table.addGlobalSecondaryIndex({
            indexName: gsiConfig.indexName,
            partitionKey: {
              name: gsiConfig.partitionKey,
              type: dynamodb.AttributeType.STRING,
            },
            sortKey: gsiConfig.sortKey ? {
              name: gsiConfig.sortKey,
              type: dynamodb.AttributeType.STRING,
            } : undefined,
          });
        });
      }

      this.dynamoTables![tableConfig.name] = table;
    });
  }

  private setupAuroraServerless(config: DatabaseConfig, projectName: string, environment: string) {
    if (!config.auroraConfig) return;

    // Create VPC for Aurora
    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: `${projectName}-${environment}-vpc`,
      maxAzs: 2,
      natGateways: environment === 'prod' ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Create database credentials secret
    this.auroraSecret = new secretsmanager.Secret(this, 'AuroraSecret', {
      secretName: `${projectName}-${environment}-aurora-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: config.auroraConfig.masterUsername }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // Create Aurora Serverless cluster
    this.auroraCluster = new rds.ServerlessCluster(this, 'AuroraCluster', {
      clusterIdentifier: `${projectName}-${environment}-aurora`,
      engine: config.auroraConfig.engine === 'mysql' 
        ? rds.DatabaseClusterEngine.auroraMysql({
            version: rds.AuroraMysqlEngineVersion.VER_3_02_0,
          })
        : rds.DatabaseClusterEngine.auroraPostgres({
            version: rds.AuroraPostgresEngineVersion.VER_13_7,
          }),
      credentials: rds.Credentials.fromSecret(this.auroraSecret),
      defaultDatabaseName: config.auroraConfig.databaseName,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      scaling: {
        autoPause: cdk.Duration.minutes(environment === 'prod' ? 0 : 10),
        minCapacity: rds.AuroraCapacityUnit.ACU_2,
        maxCapacity: environment === 'prod' ? rds.AuroraCapacityUnit.ACU_64 : rds.AuroraCapacityUnit.ACU_16,
      },
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: environment === 'prod',
    });
  }

  public getDynamoTable(tableName: string): dynamodb.Table | undefined {
    return this.dynamoTables?.[tableName];
  }
} 