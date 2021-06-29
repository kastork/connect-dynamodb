import express from 'express';
import expressSession from 'express-session';
import dynamodbConnect from "../../src/index";
import AWS from 'aws-sdk';


export function app() {
  const _app = express();
  const options = {
    client: new AWS.DynamoDB({
      endpoint: new AWS.Endpoint('http://localhost:8000'),
      region: 'us-east-1'
    })
  };

  const DynamoDBStore = dynamodbConnect(options);
  _app.use(expressSession({ store: new DynamoDBStore(options), secret: 'keyboard cat' }));

  _app.use(expressSession({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }))

  _app.get('/', (req: express.Request, res: express.Response) => {
    (req.session as any).test = true;
    res.status(200).json((req as any).session);
  });

  return _app;
}
