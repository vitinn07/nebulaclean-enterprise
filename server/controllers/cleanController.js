const cleanLocalService = require('../services/cleanLocalService');
const cleanMemoryService = require('../services/cleanMemoryService');
const networkService = require('../services/networkService');

async function localClean(req, res, next) {
  try {
    const body = req.body || {};
    const result = await cleanLocalService.runLocalClean(
      {
        simulation: body.simulation !== false,
        runCleanmgr: !!body.runCleanmgr,
        flushDns: body.flushDns !== false,
        clearRecycleBin: !!body.clearRecycleBin,
        runDism: !!body.runDism
      },
      req.user
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function memoryClean(req, res, next) {
  try {
    const body = req.body || {};
    const result = await cleanMemoryService.runMemoryCleanup(
      {
        runGC: body.runGC !== false,
        restartExplorer: !!body.restartExplorer,
        flushDns: body.flushDns !== false,
        emptyStandbyListPath: body.emptyStandbyListPath || ''
      },
      req.user
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function networkDiscover(req, res, next) {
  try {
    const machines = await networkService.discoverMachines();
    return res.json({ machines });
  } catch (err) {
    return next(err);
  }
}

async function networkRun(req, res, next) {
  try {
    const computers = req.body?.computers || req.body?.machines || [];
    const list = Array.isArray(computers) ? computers : [computers];
    const result = await networkService.runRemoteClean(list, req.user);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  localClean,
  memoryClean,
  networkDiscover,
  networkRun
};
