import request from 'supertest';
import { app } from './app';
jest.setTimeout(30000)
describe('Test connect', () => {

  it('should successful request', (done) => {
    request(app())
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should not keep session for multiple call with different session', (done) => {
    const server = app();
    let cookies: any;
    const agent = request(server);

    agent.get('/inc')
      .expect((res) => {
        cookies = res.headers['set-cookie'];
        expect(res.body.count).toEqual(1)
      })
      .end(() => {
        agent.get('/inc')
          .expect((res) => {
            expect(res.body.count).toEqual(1)
          })
          .expect(200, done)
      })
  });

  it('should maintain session for multiple call with same session', (done) => {
    const server = app();
    let cookies: any;
    const agent = request(server);

    agent.get('/inc')
      .expect((res) => {
        cookies = res.headers['set-cookie'];
        expect(res.body.count).toEqual(1)
      })
      .end(() => {
        agent.get('/inc')
          .set('Cookie', cookies)
          .expect((res) => {
            const foo = res.body.count
            expect(foo).toEqual(2)
          })
          .expect(200, done)
      })
  });

  it('should reset session when generate was called', (done) => {
    const server = request(app());
    let cookies: any;
    server
      .get('/inc')
      .expect((res) => {
        cookies = res.headers['set-cookie']
        expect(res.body.count).toEqual(1)
      })
      .end(() => {
        server
          .get('/reset')
          .set('Cookie', cookies)
          .expect((res) => {
            cookies = res.headers['set-cookie']
          })
          .end(() => {
            server
              .get('/inc')
              .set('Cookie', cookies)
              .expect((res) => {
                cookies = res.headers['set-cookie']
                expect(res.body.count).toEqual(1)
              })
              .end(done)
          })
      })



  });


  it('should not return expired session', (done) => {
    const server = request(app(2000));
    let cookies: any;
    server
      .get('/inc')
      .expect((res) => {
        cookies = res.headers['set-cookie']
        expect(res.body.count).toEqual(1)
      })
      .end(() => {
        setTimeout(() => {
          server
            .get('/inc')
            .set('Cookie', cookies)
            .expect((res) => {
              cookies = res.headers['set-cookie']
              expect(res.body.count).toEqual(1)
            })
            .end(done)
        }, 2001)
      })
  });

})
