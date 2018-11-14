// const assert = require('assert');
const beanstalkc = require('../index');
const mocha = require('mocha');
const describe = mocha.describe;
const chai = require('chai');
const should = chai.should();

let connection;

const job_data = {
   "type": "test"
};

locals = {};

describe('beanstalkc:', function () {
   before('connect()', function (done) {
      beanstalkc.connect('127.0.0.1:11300', function (err, conn) {
         should.not.exist(err);
         conn.should.be.not.null;
         connection = conn;
         done();
      });
   });

   describe('put()', function () {
      it('puts a job into the tube', function (done) {
         connection.put(0, 0, 1, JSON.stringify(job_data), function (err, job_id) {
            err.should.be.false;
            should.exist(job_id);
            job_id.should.be.a('string');
            done();
         });
      });
   });

   describe('reserve()', function () {
      it('gets a ready job from the tube', function (done) {
         connection.reserve(function (err, job_id, job_json) {
            err.should.be.false;
            job_id.should.be.a('string');
            job_json.should.be.equal(JSON.stringify(job_data));

            locals.job_id = job_id;

            done();
         });
      });
   });

   describe('destroy()', function () {
      it('destroys given job from the tube', function (done) {
         connection.destroy(locals.job_id, function (err) {
            err.should.be.false;
            done();
         });
      });
   });

   describe('utf8 jobs:', function () {
      it('puts utf8 string', function (done) {
         connection.put(0, 0, 1, 'latin À', function (err, job_id) {
            err.should.be.false;
            job_id.should.be.a('string');
            done();
         });
      });

      it('gets utf8 string', function (done) {
         connection.reserve(function (err, job_id, job_string) {
            err.should.be.false;
            job_id.should.be.a('string');
            job_string.should.be.equal('latin À');

            connection.destroy(job_id, function (err) {
               err.should.be.false;
               done();
            });
         });
      });
   });

   describe('parallel jobs:', function () {
      it('puts 3 jobs parallely', function (done) {
         let count = 0;

         connection.put(0, 0, 1, 'job1', function (err, job_id) {
            err.should.be.false;
            job_id.should.be.a('string');

            count += 1;
            if (count === 3) done();
         });

         connection.put(0, 0, 1, 'job2', function (err, job_id) {
            err.should.be.false;
            job_id.should.be.a('string');

            count += 1;
            if (count === 3) done();
         });

         connection.put(0, 0, 1, 'job3', function (err, job_id) {
            err.should.be.false;
            job_id.should.be.a('string');

            count += 1;
            if (count === 3) done();
         });
      });
   });

   describe('stats-tube', function () {
      it('gets tube statistics', function (done) {
         connection.stats_tube('default', (err, result) => {
            err.should.be.false;
            result.should.have.property('name');
            result.should.have.property('current-jobs-ready');
            result.name.should.be.equal('default');
            done();
         })
      })
   });

   after('clean jobs',function (done) {
      function cleanTube(end) {
         connection.stats_tube('default', (err, result) => {
            if (result['current-jobs-ready'] > 0) {
               connection.reserve(function (err, job_id, job_json) {
                  if (!err) {
                     if (job_id) {
                        connection.destroy(job_id, function (err) {
                           cleanTube(end);
                        });
                     } else {
                        end();
                     }
                  } else {
                     end();
                  }
               });
            } else {
               end();
            }
         })
      }
      cleanTube(done);
   });
});


