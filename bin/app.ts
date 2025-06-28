#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerlessWebAppStack } from '../lib/serverless-webapp-stack';
import { defaultConfig } from '../config/app-config';

const app = new cdk.App();

// Get configuration from context or use defaults
const config = {
  ...defaultConfig,
  // Override with context values if provided
  projectName: app.node.tryGetContext('projectName') || defaultConfig.projectName,
  environment: app.node.tryGetContext('environment') || defaultConfig.environment,
  account: app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION,
};

new ServerlessWebAppStack(app, `${config.projectName}-${config.environment}`, {
  config,
  env: {
    account: config.account,
    region: config.region,
  },
  description: `Serverless Web Application Stack for ${config.projectName} (${config.environment})`,
}); 