import express from 'express';
import expressSession from 'express-session';
import connectSession from "../../src/index";
import AWS from 'aws-sdk';


export function app(maxAge = 1000) {
  const _app = express();
  const options = {
    saveUninitialized: true,
    resave: true,
    client: new AWS.DynamoDB({
      endpoint: new AWS.Endpoint('http://localhost:8000'),
      region: 'us-east-1'
    })
  };
  const DynamoDBStore = connectSession(expressSession)
  _app.use(expressSession({
    cookie: {
      maxAge,
    },
    store: new DynamoDBStore(options), secret: 'keyboard cat'
  }));

  _app.use(expressSession({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }))
  // _app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  //   res.json(err)
  // })
  _app.get('/', (req: express.Request, res: express.Response) => {
    (req.session as any).test = true;
    res.status(200).json((req as any).session);
  });

  _app.get('/inc', (req: express.Request, res: express.Response) => {
    (req.session as any).count = ((req.session as any).count || 0) + 1;
    res.status(200).json((req as any).session);
  });

  // _app.get('/inc', (req: express.Request, res: express.Response) => {
  //   (req.session as any).count = ((req.session as any).count || 0) + 1;
  //   res.status(200).json((req as any).session);
  // });


  _app.get('/reset', async (req: express.Request, res: express.Response) => {
    const oldId = req.session.id;
    try {
      req.session.regenerate(() => {
        (req.session as any).oldId = oldId
        res.json({
          ...req.session
        })
      });
    } catch (err) {
      console.log(err)
    }

  });


  return _app;
}
