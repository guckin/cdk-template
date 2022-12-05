import { Logger } from './logger';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export class HelloWorldHandler {

    constructor(private readonly logger: Logger) {
    }

    invoke = (): APIGatewayProxyStructuredResultV2 => {
        this.logger.log('Hello World');
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({hello: 'World'})
        };
    }
}