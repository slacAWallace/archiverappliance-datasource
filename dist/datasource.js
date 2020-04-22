"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArchiverapplianceDatasource = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _dataProcessor = _interopRequireDefault(require("./dataProcessor"));

var aafunc = _interopRequireWildcard(require("./aafunc"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Variable format descriptions
 * ---
 * timeseries = {
 *   "target":"PV1", // Used as legend in Grafana
 *   "datapoints":[
 *     [622, 1450754160000], // Metric value as a float, unixtimestamp in milliseconds
 *     [365, 1450754220000]
 *   ]
 * }
 * timeseriesData = [ timeseries, timeseries, ... ]
 * timeseriesDataArray = [ timeseriesData, timeseriesData, ... ]
 */
var ArchiverapplianceDatasource =
/*#__PURE__*/
function () {
  function ArchiverapplianceDatasource(instanceSettings, backendSrv, templateSrv) {
    _classCallCheck(this, ArchiverapplianceDatasource);

    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {
      'Content-Type': 'application/json'
    };

    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers.Authorization = instanceSettings.basicAuth;
    }

    this.operatorList = ['firstSample', 'lastSample', 'firstFill', 'lastFill', 'mean', 'min', 'max', 'count', 'ncount', 'nth', 'median', 'std', 'jitter', 'ignoreflyers', 'flyers', 'variance', 'popvariance', 'kurtosis', 'skewness', 'raw'];
  } // Called from Grafana panels to get data


  _createClass(ArchiverapplianceDatasource, [{
    key: "query",
    value: function query(options) {
      var _this = this;

      var query = this.buildQueryParameters(options); // Remove hidden target from query

      query.targets = _lodash.default.filter(query.targets, function (t) {
        return !t.hide;
      });

      if (query.targets.length <= 0) {
        return Promise.resolve({
          data: []
        });
      }

      var targetProcesses = _lodash.default.map(query.targets, function (target) {
        return _this.targetProcess(target);
      });

      return Promise.all(targetProcesses).then(function (timeseriesDataArray) {
        return _this.postProcess(timeseriesDataArray);
      });
    }
  }, {
    key: "targetProcess",
    value: function targetProcess(target) {
      var _this2 = this;

      return this.buildUrls(target).then(function (urls) {
        return _this2.doMultiUrlRequests(urls);
      }).then(function (responses) {
        return _this2.responseParse(responses);
      }).then(function (timeseriesData) {
        return _this2.setAlias(timeseriesData, target);
      }).then(function (timeseriesData) {
        return _this2.applyFunctions(timeseriesData, target);
      });
    }
  }, {
    key: "postProcess",
    value: function postProcess(timeseriesDataArray) {
      var timeseriesData = _lodash.default.flatten(timeseriesDataArray);

      return {
        data: timeseriesData
      };
    }
  }, {
    key: "buildUrls",
    value: function buildUrls(target) {
      var _this3 = this;

      // Get Option values
      var maxNumPVs = target.options.maxNumPVs || 100;
      var binInterval = target.options.binInterval || target.interval;
      var targetPVs = this.parseTargetPV(target.target); // Create Promise to fetch PV names

      var pvnamesPromise = _lodash.default.map(targetPVs, function (targetPV) {
        if (target.regex) {
          return _this3.pvNamesFindQuery(targetPV, maxNumPVs);
        }

        return Promise.resolve([targetPV]);
      });

      return Promise.all(pvnamesPromise).then(function (pvnamesArray) {
        return new Promise(function (resolve, reject) {
          var pvnames = _lodash.default.slice(_lodash.default.uniq(_lodash.default.flatten(pvnamesArray)), 0, maxNumPVs);

          var urls;

          try {
            urls = _lodash.default.map(pvnames, function (pvname) {
              return _this3.buildUrl(pvname, target.operator, binInterval, target.from, target.to);
            });
          } catch (e) {
            reject(e);
          }

          resolve(urls);
        });
      });
    }
  }, {
    key: "buildUrl",
    value: function buildUrl(pvname, operator, interval, from, to) {
      var _this4 = this;

      var pv = function () {
        // raw Operator
        if (operator === 'raw' || interval === '') {
          return "".concat(pvname);
        } // Default Operator


        if (_lodash.default.includes(['', undefined], operator)) {
          return "mean_".concat(interval, "(").concat(pvname, ")");
        } // Other Operator


        if (_lodash.default.includes(_this4.operatorList, operator)) {
          return "".concat(operator, "_").concat(interval, "(").concat(pvname, ")");
        }

        throw new Error('Data Processing Operator is invalid.');
      }();

      var url = "".concat(this.url, "/data/getData.json?pv=").concat(encodeURIComponent(pv), "&from=").concat(from.toISOString(), "&to=").concat(to.toISOString());
      return url;
    }
  }, {
    key: "doMultiUrlRequests",
    value: function doMultiUrlRequests(urls) {
      var _this5 = this;

      var requests = _lodash.default.map(urls, function (url) {
        return _this5.doRequest({
          url: url,
          method: 'GET'
        });
      });

      return Promise.all(requests);
    }
  }, {
    key: "responseParse",
    value: function responseParse(responses) {
      var timeSeriesDataArray = _lodash.default.map(responses, function (response) {
        var timeSeriesData = _lodash.default.map(response.data, function (targetRes) {
          var timesiries = _lodash.default.map(targetRes.data, function (datapoint) {
            return [datapoint.val, datapoint.secs * 1000 + _lodash.default.floor(datapoint.nanos / 1000000)];
          });

          var timeseries = {
            target: targetRes.meta.name,
            datapoints: timesiries
          };
          return timeseries;
        });

        return timeSeriesData;
      });

      return Promise.resolve(_lodash.default.flatten(timeSeriesDataArray));
    }
  }, {
    key: "setAlias",
    value: function setAlias(timeseriesData, target) {
      if (!target.alias) {
        return Promise.resolve(timeseriesData);
      }

      var pattern;

      if (target.aliasPattern) {
        pattern = new RegExp(target.aliasPattern, '');
      }

      var newTimeseriesData = _lodash.default.map(timeseriesData, function (timeseries) {
        if (pattern) {
          var alias = timeseries.target.replace(pattern, target.alias);
          return {
            target: alias,
            datapoints: timeseries.datapoints
          };
        }

        return {
          target: target.alias,
          datapoints: timeseries.datapoints
        };
      });

      return Promise.resolve(newTimeseriesData);
    }
  }, {
    key: "applyFunctions",
    value: function applyFunctions(timeseriesData, target) {
      if (target.functions === undefined) {
        return Promise.resolve(timeseriesData);
      }

      return this.applyFunctionDefs(target.functions, ['Transform', 'Filter Series'], timeseriesData);
    } // Called from Grafana data source configuration page to make sure the connection is working

  }, {
    key: "testDatasource",
    value: function testDatasource() {
      return {
        status: 'success',
        message: 'Data source is working',
        title: 'Success'
      };
    }
  }, {
    key: "pvNamesFindQuery",
    value: function pvNamesFindQuery(query, maxPvs) {
      if (!query) {
        return Promise.resolve([]);
      }

      var url = "".concat(this.url, "/bpl/getMatchingPVs?limit=").concat(maxPvs, "&regex=").concat(encodeURIComponent(query));
      return this.doRequest({
        url: url,
        method: 'GET'
      }).then(function (res) {
        return res.data;
      });
    } // Called from Grafana variables to get values

  }, {
    key: "metricFindQuery",
    value: function metricFindQuery(query) {
      var _this6 = this;

      /*
       * query format:
       * ex1) PV:NAME:.*
       * ex2) PV:NAME:.*?limit=10
       */
      var replacedQuery = this.templateSrv.replace(query, null, 'regex');

      var _replacedQuery$split = replacedQuery.split('?', 2),
          _replacedQuery$split2 = _slicedToArray(_replacedQuery$split, 2),
          pvQuery = _replacedQuery$split2[0],
          paramsQuery = _replacedQuery$split2[1];

      var parsedPVs = this.parseTargetPV(pvQuery); // Parse query parameters

      var limitNum = 100;

      if (paramsQuery) {
        var params = new URLSearchParams(paramsQuery);

        if (params.has('limit')) {
          var limit = parseInt(params.get('limit'), 10);
          limitNum = Number.isInteger(limit) ? limit : 100;
        }
      }

      var pvnamesPromise = _lodash.default.map(parsedPVs, function (targetQuery) {
        return _this6.pvNamesFindQuery(targetQuery, limitNum);
      });

      return Promise.all(pvnamesPromise).then(function (pvnamesArray) {
        var pvnames = _lodash.default.slice(_lodash.default.uniq(_lodash.default.flatten(pvnamesArray)), 0, limitNum);

        return _lodash.default.map(pvnames, function (pvname) {
          return {
            text: pvname
          };
        });
      });
    }
  }, {
    key: "doRequest",
    value: function doRequest(options) {
      var newOptions = _objectSpread({}, options);

      newOptions.withCredentials = this.withCredentials;
      newOptions.headers = this.headers;
      var result = this.backendSrv.datasourceRequest(newOptions);
      return result;
    }
  }, {
    key: "buildQueryParameters",
    value: function buildQueryParameters(options) {
      var _this7 = this;

      /*
       * options argument format
       * ---
       * {
       *   ...
       *   "range": { "from": "2015-12-22T03:06:13.851Z", "to": "2015-12-22T06:48:24.137Z" },
       *   "interval": "5s",
       *   "targets": [
       *     { "refId":"A",
       *       "target":"PV:NAME:.*",
       *       "regex":true,
       *       "operator":"mean",
       *       "alias":"$3",
       *       "aliasPattern":"(.*):(.*)",
       *       "functions":[
       *         {
       *           "text":"top($top_num, max)",
       *           "params":[ "$top_num", "max" ],
       *           "def":{
       *             "category":"Filter Series",
       *             "defaultParams":[ 5, "avg" ],
       *             "name":"top",
       *             "params":[
       *               { "name":"number", "type":"int" },
       *               {
       *                 "name":"value",
       *                 "options":[ "avg", "min", "max", "absoluteMin", "absoluteMax", "sum" ],
       *                 "type":"string"
       *               }
       *             ]
       *           },
       *         }
       *       ],
       *     }
       *   ],
       *   "format": "json",
       *   "maxDataPoints": 2495 // decided by the panel
       *   ...
       * }
       */
      var query = _objectSpread({}, options); // remove placeholder targets and undefined targets


      query.targets = _lodash.default.filter(query.targets, function (target) {
        return target.target !== '' && typeof target.target !== 'undefined';
      });

      if (query.targets.length <= 0) {
        return query;
      }

      var from = new Date(query.range.from);
      var to = new Date(query.range.to);
      var rangeMsec = to.getTime() - from.getTime();

      var intervalSec = _lodash.default.floor(rangeMsec / (query.maxDataPoints * 1000));

      var interval = intervalSec >= 1 ? String(intervalSec) : '';

      var targets = _lodash.default.map(query.targets, function (target) {
        // Replace parameters with variables for each functions
        var functions = _lodash.default.map(target.functions, function (func) {
          var newFunc = func;
          newFunc.params = _lodash.default.map(newFunc.params, function (param) {
            return _this7.templateSrv.replace(param, query.scopedVars, 'regex');
          });
          return newFunc;
        });

        return {
          target: _this7.templateSrv.replace(target.target, query.scopedVars, 'regex'),
          refId: target.refId,
          hide: target.hide,
          alias: _this7.templateSrv.replace(target.alias, query.scopedVars, 'regex'),
          operator: _this7.templateSrv.replace(target.operator, query.scopedVars, 'regex'),
          functions: functions,
          regex: target.regex,
          aliasPattern: target.aliasPattern,
          options: _this7.getOptions(target.functions),
          from: from,
          to: to,
          interval: interval
        };
      });

      query.targets = targets;
      return query;
    }
  }, {
    key: "parseTargetPV",
    value: function parseTargetPV(targetPV) {
      /*
       * ex) targetPV = ABC(1|2|3)EFG(5|6)
       *     then
       *     splitQueries = ['ABC','(1|2|3'), 'EFG', '(5|6)']
       *     queries = [
       *     ABC1EFG5, ABC1EFG6, ABC2EFG6,
       *     ABC2EFG6, ABC3EFG5, ABC3EFG6
       *     ]
       */
      var splitQueries = _lodash.default.split(targetPV, /(\(.*?\))/);

      var queries = [''];

      _lodash.default.forEach(splitQueries, function (splitQuery, i) {
        // Fixed string like 'ABC'
        if (i % 2 === 0) {
          queries = _lodash.default.map(queries, function (query) {
            return "".concat(query).concat(splitQuery);
          });
          return;
        } // Regex OR string like '(1|2|3)'


        var orElems = _lodash.default.split(_lodash.default.trim(splitQuery, '()'), '|');

        var newQueries = _lodash.default.map(queries, function (query) {
          return _lodash.default.map(orElems, function (orElem) {
            return "".concat(query).concat(orElem);
          });
        });

        queries = _lodash.default.flatten(newQueries);
      });

      return queries;
    }
  }, {
    key: "applyFunctionDefs",
    value: function applyFunctionDefs(functionDefs, categories, data) {
      var applyFuncDefs = this.pickFuncDefsFromCategories(functionDefs, categories);

      var promises = _lodash.default.reduce(applyFuncDefs, function (prevPromise, func) {
        return prevPromise.then(function (res) {
          var funcInstance = aafunc.createFuncInstance(func.def, func.params);
          var bindedFunc = funcInstance.bindFunction(_dataProcessor.default.aaFunctions);
          return Promise.resolve(bindedFunc(res));
        });
      }, Promise.resolve(data));

      return promises;
    }
  }, {
    key: "getOptions",
    value: function getOptions(functionDefs) {
      var appliedOptionFuncs = this.pickFuncDefsFromCategories(functionDefs, ['Options']);

      var options = _lodash.default.reduce(appliedOptionFuncs, function (optionMap, func) {
        var _func$params = _slicedToArray(func.params, 1);

        optionMap[func.def.name] = _func$params[0];
        return optionMap;
      }, {});

      return options;
    }
  }, {
    key: "pickFuncDefsFromCategories",
    value: function pickFuncDefsFromCategories(functionDefs, categories) {
      var allCategorisedFuncDefs = aafunc.getCategories();

      var requiredCategoryFuncNames = _lodash.default.reduce(categories, function (funcNames, category) {
        return _lodash.default.concat(funcNames, _lodash.default.map(allCategorisedFuncDefs[category], 'name'));
      }, []);

      var pickedFuncDefs = _lodash.default.filter(functionDefs, function (func) {
        return _lodash.default.includes(requiredCategoryFuncNames, func.def.name);
      });

      return pickedFuncDefs;
    }
  }]);

  return ArchiverapplianceDatasource;
}();

exports.ArchiverapplianceDatasource = ArchiverapplianceDatasource;
//# sourceMappingURL=datasource.js.map
