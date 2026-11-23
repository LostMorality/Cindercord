// @webpack: Equicord's module finders. Phoenix has no webpack/React module graph, so these
// return the catch-all stub. A plugin that only pulls data through stores/RestAPI never hits
// these; one that needs a Discord React module will log that it is unsupported.
"use strict";

const stub = require("./_stub.js");

function finder() {
  return stub;
}

module.exports = {
  __esModule: true,
  find: finder,
  findByProps: finder,
  findByPropsLazy: finder,
  findByCode: finder,
  findByCodeLazy: finder,
  findComponentByCode: finder,
  findComponentByCodeLazy: finder,
  findStore: finder,
  findStoreLazy: finder,
  findLazy: finder,
  findExportedComponentLazy: finder,
  mapMangledModule: finder,
  mapMangledModuleLazy: finder,
  webpackDependencies: {},
  filters: new Proxy({}, { get: () => finder }),
  waitFor: function () {},
  wreq: stub,
};
