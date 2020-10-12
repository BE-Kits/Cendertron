import * as puppeteer from 'puppeteer';
import * as genericPool from 'generic-pool';
import { logger } from '../crawler/supervisor/logger';

export const createPuppeteerPool = ({
  max = 10,
  // optional. if you set this, make sure to drain() (see step 3)
  min = 2,
  // specifies how long a resource can stay idle in pool before being removed
  idleTimeoutMillis = 30000,
  // specifies the maximum number of times a resource can be reused before being destroyed
  maxUses = 50,
  testOnBorrow = true,
  puppeteerArgs = [],
  validator = (_instance: any) => Promise.resolve(true),
  ...otherConfig
} = {}) => {
  // TODO: randomly destroy old instances to avoid resource leak?
  const factory = {
    create: () =>
      puppeteer.launch(...puppeteerArgs).then((instance: any) => {
        instance.useCount = 0;
        return instance;
      }),

    destroy: (instance: any) => {
      instance.close();
    },

    validate: (instance: any) => {
      return validator(instance).then(valid =>
        Promise.resolve(valid && (maxUses <= 0 || instance.useCount < maxUses))
      );
    }
  };
  const config = {
    max,
    min,
    idleTimeoutMillis,
    testOnBorrow,
    ...otherConfig
  };

  const pool = genericPool.createPool<puppeteer.Browser>(
    factory as any,
    config
  );

  pool.on('factoryCreateError', function(err) {
    console.error(err);
    logger.error('>>>puppeteer-pool>>factoryCreateError' + err);
  });

  pool.on('factoryDestroyError', function(err) {
    logger.error('>>>puppeteer-pool>>factoryDestroyError' + err);
  });

  const genericAcquire = pool.acquire.bind(pool);

  pool.acquire = () =>
    genericAcquire().then((instance: any) => {
      instance.useCount += 1;
      return instance;
    });

  pool.use = (fn: any) => {
    let resource: any;
    return pool
      .acquire()
      .then(r => {
        resource = r;
        return resource;
      })
      .then(fn)
      .then(
        result => {
          if (resource) {
            (pool.release(resource) as any).catch((e: Error) => {
              console.error(e);
            });
          }

          return result;
        },
        err => {
          if (resource) {
            (pool.release(resource) as any).catch((e: Error) => {
              console.error(e);
            });
          }
          throw err;
        }
      );
  };

  return pool;
};
