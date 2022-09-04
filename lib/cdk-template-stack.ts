import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {JsonPath, StateMachine, StateMachineType} from 'aws-cdk-lib/aws-stepfunctions';
import {JsonSchemaType, Model, RestApi, StepFunctionsIntegration} from 'aws-cdk-lib/aws-apigateway';
import {AttributeType, Table} from 'aws-cdk-lib/aws-dynamodb';
import {DynamoAttributeValue, DynamoPutItem, LambdaInvoke} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';

export class CdkTemplateStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const dynamoTable = new Table(this, 'DogTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            }
        });

        dynamoTable.autoScaleWriteCapacity({
            minCapacity: 1,
            maxCapacity: 10
        });

        const uuidFunction = new Function(this, 'UUIDFunction', {
            code: Code.fromAsset(__dirname),
            handler: 'uuid.uuidHandler',
            runtime: Runtime.NODEJS_16_X
        });

        const uuidInvoke = new LambdaInvoke(this, 'uuid', {
            lambdaFunction: uuidFunction
        });

        const dynamoPutItem = new DynamoPutItem(this, 'PutItem', {
            item: {
                id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.id')),
                name: DynamoAttributeValue.fromString(JsonPath.stringAt('$.name')),
                breed: DynamoAttributeValue.fromString(JsonPath.stringAt('$.breed'))
            },
            table: dynamoTable,
            resultPath: '$.Item',
        });

        const stateMachineDefinition = uuidInvoke.next(dynamoPutItem);

        const stateMachine = new StateMachine(this, 'MyStateMachine', {
            definition: stateMachineDefinition,
            stateMachineType: StateMachineType.EXPRESS,
        });

        const api = new RestApi(this, 'StepFunctionsRestApi', {
            restApiName: 'StateMachineAPI',
            deploy: true
        });

        const dogModel: Model = api.addModel(
            'DogModel',
            {
                schema: {
                    type: JsonSchemaType.OBJECT,
                    properties: {
                        name: {
                            type: JsonSchemaType.STRING
                        },
                        breed: {
                            type: JsonSchemaType.STRING
                        }
                    },
                    required: ['name', 'breed']
                }
            }
        );

        api.root.addResource('/dogs').addMethod(
            'POST',
            StepFunctionsIntegration.startExecution(stateMachine),
            {
                requestModels: {
                    'application/json': dogModel
                },
                requestValidatorOptions: {
                    validateRequestBody: true
                }
            }
        );
    }
}
