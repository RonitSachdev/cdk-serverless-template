import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { AppConfig } from '../../config/app-config';

export interface S3ConstructProps {
  config: AppConfig['s3'];
  projectName: string;
  environment: string;
}

export class S3Construct extends Construct {
  public readonly bucket: s3.Bucket;
  public distribution?: cloudfront.Distribution;
  public websiteUrl?: string;
  public distributionDomainName?: string;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    const { config, projectName, environment } = props;

    // Create S3 bucket
    this.bucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      bucketName: `${projectName}-${environment}-static-assets-${Math.random().toString(36).substring(7)}`,
      versioned: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      publicReadAccess: config.enableWebsiteHosting && !config.enableCloudFront,
      blockPublicAccess: config.enableCloudFront 
        ? s3.BlockPublicAccess.BLOCK_ALL 
        : s3.BlockPublicAccess.BLOCK_ACLS,
      websiteIndexDocument: config.enableWebsiteHosting ? 'index.html' : undefined,
      websiteErrorDocument: config.enableWebsiteHosting ? 'error.html' : undefined,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Set website URL if website hosting is enabled
    if (config.enableWebsiteHosting && !config.enableCloudFront) {
      this.websiteUrl = this.bucket.bucketWebsiteUrl;
    }

    // Create CloudFront distribution if enabled
    if (config.enableCloudFront) {
      this.createCloudFrontDistribution(config, projectName, environment);
    }

    // Add sample files
    this.addSampleFiles();
  }

  private createCloudFrontDistribution(
    config: AppConfig['s3'],
    projectName: string,
    environment: string
  ) {
    // Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OAI for ${projectName}-${environment}`,
    });

    // Grant CloudFront access to S3 bucket
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [originAccessIdentity.grantPrincipal],
      actions: ['s3:GetObject'],
      resources: [this.bucket.arnForObjects('*')],
    }));

    // Certificate for custom domain (if provided)
    let certificate: certificatemanager.ICertificate | undefined;
    if (config.customDomain?.certificateArn) {
      certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        config.customDomain.certificateArn
      );
    }

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${projectName}-${environment} static assets distribution`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: config.customDomain?.domainName ? [config.customDomain.domainName] : undefined,
      certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
      priceClass: environment === 'prod' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL 
        : cloudfront.PriceClass.PRICE_CLASS_100,
    });

    this.distributionDomainName = this.distribution.distributionDomainName;
    this.websiteUrl = `https://${this.distributionDomainName}`;
  }

  private addSampleFiles() {
    // Add sample index.html
    new s3deploy.BucketDeployment(this, 'SampleFiles', {
      sources: [s3deploy.Source.data('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Serverless Web App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 { margin-top: 0; }
        .api-test { margin: 2rem 0; }
        button {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3); }
        #result {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            font-family: monospace;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Serverless Web App</h1>
        <p>Your serverless application is running! This template includes:</p>
        <ul>
            <li>✅ AWS Lambda Functions</li>
            <li>✅ API Gateway</li>
            <li>✅ DynamoDB/Aurora Serverless</li>
            <li>✅ S3 Static Hosting</li>
            <li>✅ CloudFront Distribution</li>
        </ul>
        
        <div class="api-test">
            <h3>Test Your API</h3>
            <button onclick="testApi()">Test API Endpoint</button>
            <div id="result"></div>
        </div>
    </div>

    <script>
        async function testApi() {
            try {
                const response = await fetch('/api/items');
                const data = await response.json();
                document.getElementById('result').textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                document.getElementById('result').textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>`)],
      destinationBucket: this.bucket,
    });
  }
} 