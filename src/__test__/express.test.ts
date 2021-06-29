import request from 'supertest';
import { app } from './app';
describe('Test connect', () => {

  it('responds with json', (done) => {
    request(app())
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
})
