import * as constructs from 'constructs';
import { Template } from '../../../assertions';
import * as api from '../../../aws-apigateway';
import * as events from '../../../aws-events';
import * as iam from '../../../aws-iam';
import * as lambda from '../../../aws-lambda';
import * as sqs from '../../../aws-sqs';
import * as cdk from '../../../core';
import * as targets from '../../lib';

test('use a SpecRestApi APIGateway event rule target', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const specRestApi = newTestSpecRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN
  const apiGatewayTarget = new targets.ApiGateway(specRestApi);
  rule.addTarget(apiGatewayTarget);

  // THEN
  expect(() => apiGatewayTarget.restApi).toThrow('The iRestApi is not a RestApi construct, and cannot be retrieved this way.');
  expect(apiGatewayTarget.iRestApi).toBe(specRestApi);

  Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
    Targets: [
      {
        Arn: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':execute-api:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':',
              {
                Ref: 'MySpecRestApiFB7DB2AB',
              },
              '/',
              {
                Ref: 'MySpecRestApiDeploymentStageprod8522A503',
              },
              '/*/',
            ],
          ],
        },
        HttpParameters: {},
        Id: 'Target0',
        RoleArn: {
          'Fn::GetAtt': [
            'MySpecRestApiEventsRole25C1D10F',
            'Arn',
          ],
        },
      },
    ],
  });
});

test('use api gateway rest api as an event rule target', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const restApi = newTestRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN
  rule.addTarget(new targets.ApiGateway(restApi));

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
    Targets: [
      {
        Arn: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':execute-api:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':',
              {
                Ref: 'MyLambdaRestApiECB8AFAF',
              },
              '/',
              {
                Ref: 'MyLambdaRestApiDeploymentStageprodA127C527',
              },
              '/*/',
            ],
          ],
        },
        HttpParameters: {},
        Id: 'Target0',
        RoleArn: {
          'Fn::GetAtt': [
            'MyLambdaRestApiEventsRole3C0505CC',
            'Arn',
          ],
        },
      },
    ],
  });
});

test('with stage, path, method setting', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const restApi = newTestRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN
  const stage = 'test-stage';
  const path = '/test-path';
  const method = 'GET';
  rule.addTarget(new targets.ApiGateway(restApi, {
    stage, path, method,
  }));

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
    Targets: [
      {
        Arn: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':execute-api:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':',
              {
                Ref: 'MyLambdaRestApiECB8AFAF',
              },
              '/test-stage/GET/test-path',
            ],
          ],
        },
        HttpParameters: {},
        Id: 'Target0',
        RoleArn: {
          'Fn::GetAtt': [
            'MyLambdaRestApiEventsRole3C0505CC',
            'Arn',
          ],
        },
      },
    ],
  });
});

test('with http parameters', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const restApi = newTestRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN
  const pathParameterValues = ['path1', 'path2'];
  const headerParameters = {
    TestHeader1: 'test-header-value-1',
    TestHeader2: 'test-header-value-2',
  };
  const queryStringParameters = {
    TestQueryParameter1: 'test-query-parameter-value-1',
    TestQueryParameter2: 'test-query-parameter-value-2',
  };
  rule.addTarget(new targets.ApiGateway(restApi, {
    path: '/*/*',
    pathParameterValues,
    headerParameters,
    queryStringParameters,
  }));

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
    Targets: [
      {
        HttpParameters: {
          HeaderParameters: headerParameters,
          QueryStringParameters: queryStringParameters,
          PathParameterValues: pathParameterValues,
        },
        Id: 'Target0',
      },
    ],
  });
});

test('Throw when the number of wild cards in the path not equal to the number of pathParameterValues', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const restApi = newTestRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN, THEN
  expect(() => rule.addTarget(new targets.ApiGateway(restApi, {
    pathParameterValues: ['value1'],
  }))).toThrow(/The number of wildcards in the path does not match the number of path pathParameterValues/);
  expect(() => rule.addTarget(new targets.ApiGateway(restApi, {
    path: '/*',
  }))).toThrow(/The number of wildcards in the path does not match the number of path pathParameterValues/);
  expect(() => rule.addTarget(new targets.ApiGateway(restApi, {
    path: '/*/*',
    pathParameterValues: ['value1'],
  }))).toThrow(/The number of wildcards in the path does not match the number of path pathParameterValues/);
  expect(() => rule.addTarget(new targets.ApiGateway(restApi, {
    path: '/*/*',
    pathParameterValues: ['value1', 'value2'],
  }))).not.toThrow();
});

test('with an explicit event role', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const restApi = newTestRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN
  const eventRole = new iam.Role(stack, 'Trigger-test-role', {
    assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
  });
  rule.addTarget(new targets.ApiGateway(restApi, {
    eventRole,
  }));

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
    Targets: [
      {
        RoleArn: {
          'Fn::GetAtt': [
            'TriggertestroleBCF8E6AD',
            'Arn',
          ],
        },
        Id: 'Target0',
      },
    ],
  });
});

test('use a Dead Letter Queue', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const restApi = newTestRestApi(stack);
  const rule = new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  // WHEN
  const queue = new sqs.Queue(stack, 'Queue');
  rule.addTarget(new targets.ApiGateway(restApi, {
    deadLetterQueue: queue,
  }));

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
    Targets: [
      {
        DeadLetterConfig: {
          Arn: {
            'Fn::GetAtt': [
              'Queue4A7E3555',
              'Arn',
            ],
          },
        },
        Id: 'Target0',
      },
    ],
  });
});

function newTestRestApi(scope: constructs.Construct, suffix = '') {
  const lambdaFunctin = new lambda.Function(scope, `MyLambda${suffix}`, {
    code: new lambda.InlineCode('foo'),
    handler: 'bar',
    runtime: lambda.Runtime.NODEJS_LATEST,
  });
  return new api.LambdaRestApi( scope, `MyLambdaRestApi${suffix}`, {
    handler: lambdaFunctin,
  } );
}

function newTestSpecRestApi(scope: constructs.Construct, suffix = '') {
  return new api.SpecRestApi(scope, `MySpecRestApi${suffix}`, {
    apiDefinition: api.ApiDefinition.fromInline({
      openapi: '3.0.2',
      paths: {},
    }),
  });
}
