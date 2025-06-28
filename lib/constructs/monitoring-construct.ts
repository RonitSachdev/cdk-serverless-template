import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { ApiConstruct } from './api-construct';
import { AppConfig } from '../../config/app-config';

export interface MonitoringConstructProps {
  config: AppConfig['monitoring'];
  projectName: string;
  environment: string;
  api: ApiConstruct;
  lambdaFunctions: { [key: string]: lambda.Function };
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const { config, projectName, environment, api, lambdaFunctions } = props;

    if (!config) return;

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${projectName}-${environment}-dashboard`,
    });

    this.addApiMetrics(api);
    this.addLambdaMetrics(lambdaFunctions);
  }

  private addApiMetrics(api: ApiConstruct) {
    const apiWidget = new cloudwatch.GraphWidget({
      title: 'API Gateway Metrics',
      left: [
        api.restApi.metricCount(),
        api.restApi.metricLatency(),
      ],
      right: [
        api.restApi.metricClientError(),
        api.restApi.metricServerError(),
      ],
    });

    this.dashboard.addWidgets(apiWidget);
  }

  private addLambdaMetrics(lambdaFunctions: { [key: string]: lambda.Function }) {
    const functionNames = Object.keys(lambdaFunctions);
    
    // Create metrics for each function
    const durationMetrics = functionNames.map(name => 
      lambdaFunctions[name].metricDuration()
    );
    
    const invocationMetrics = functionNames.map(name => 
      lambdaFunctions[name].metricInvocations()
    );
    
    const errorMetrics = functionNames.map(name => 
      lambdaFunctions[name].metricErrors()
    );

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Duration',
      left: durationMetrics,
    });

    const lambdaInvocationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Invocations & Errors',
      left: invocationMetrics,
      right: errorMetrics,
    });

    this.dashboard.addWidgets(lambdaDurationWidget, lambdaInvocationWidget);
  }
} 