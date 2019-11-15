"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArchiverapplianceDatasource = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var ArchiverapplianceDatasource =
/*#__PURE__*/
function () {
  function ArchiverapplianceDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    _classCallCheck(this, ArchiverapplianceDatasource);

    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {
      'Content-Type': 'application/json'
    };

    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }

    var jsonData = instanceSettings.jsonData || {};
    this.url_mgmt = instanceSettings.jsonData.url_mgmt;
    this.operatorList = ["firstSample", "lastSample", "firstFill", "lastFill", "mean", "min", "max", "count", "ncount", "nth", "median", "std", "jitter", "ignoreflyers", "flyers", "variance", "popvariance", "kurtosis", "skewness", "raw"];
  }

  _createClass(ArchiverapplianceDatasource, [{
    key: "query",
    value: function query(options) {
      var _this = this;

      var query = this.buildQueryParameters(options);
      query.targets = _lodash["default"].filter(query.targets, function (t) {
        return !t.hide;
      });

      if (query.targets.length <= 0) {
        return this.q.when({
          data: []
        });
      }

      var targets = _lodash["default"].map(query.targets, function (target) {
        return _this.targetProcess(target, options);
      });

      return this.q.all(targets).then(function (data) {
        return _this.postProcess(data);
      });
    }
  }, {
    key: "targetProcess",
    value: function targetProcess(target, options) {
      var _this2 = this;

      return this.buildUrl(target, options).then(function (url) {
        return _this2.doRequest({
          url: url,
          method: 'GET'
        });
      }).then(function (res) {
        return _this2.responseParse(res);
      }).then(function (data) {
        return _this2.setAlias(data, target);
      });
    }
  }, {
    key: "postProcess",
    value: function postProcess(data) {
      var d = _lodash["default"].reduce(data, function (result, d) {
        result = result.concat(d);
        return result;
      }, []);

      return {
        data: d
      };
    }
  }, {
    key: "buildUrl",
    value: function buildUrl(target) {
      var deferred = this.q.defer();
      var pv = "";

      if (target.operator === "raw" || target.interval === "") {
        pv = "pv=" + target.target;
      } else if (_lodash["default"].includes(["", undefined], target.operator)) {
        // Default Operator
        pv = "pv=mean_" + target.interval + "(" + target.target + ")";
      } else if (_lodash["default"].includes(this.operatorList, target.operator)) {
        pv = "pv=" + target.operator + "_" + target.interval + "(" + target.target + ")";
      } else {
        deferred.reject(Error("Data Processing Operator is invalid."));
      }

      var url = this.url + '/data/getData.json?' + pv + '&from=' + target.from.toISOString() + '&to=' + target.to.toISOString();
      deferred.resolve(url);
      return deferred.promise;
    }
  }, {
    key: "responseParse",
    value: function responseParse(response) {
      var deferred = this.q.defer();

      var target_data = _lodash["default"].map(response.data, function (target_res) {
        var timesiries = _lodash["default"].map(target_res.data, function (datapoint) {
          return [datapoint.val, datapoint.secs * 1000 + _lodash["default"].floor(datapoint.nanos / 1000000)];
        });

        var target_data = {
          "target": target_res.meta["name"],
          "datapoints": timesiries
        };
        return target_data;
      });

      deferred.resolve(target_data);
      return deferred.promise;
    }
  }, {
    key: "setAlias",
    value: function setAlias(data, target) {
      var deferred = this.q.defer();

      _lodash["default"].forEach(data, function (d) {
        if (target.alias !== undefined && target.alias !== "") {
          d.target = target.alias;
        }
      });

      deferred.resolve(data);
      return deferred.promise;
    }
  }, {
    key: "testDatasource",
    value: function testDatasource() {
      return {
        status: "success",
        message: "Data source is working",
        title: "Success"
      }; //return this.doRequest({
      //  url: this.url_mgmt + '/bpl/getAppliancesInCluster',
      //  method: 'GET',
      //}).then(response => {
      //  if (response.status === 200) {
      //    return { status: "success", message: "Data source is working", title: "Success" };
      //  }
      //});
    }
  }, {
    key: "metricFindQuery",
    value: function metricFindQuery(query) {
      var str = this.templateSrv.replace(query, null, 'regex');

      if (str) {
        var s = str.toString().split('=');
        var target = s[1] || '';
        var name = s[0] || '';
      } else {
        var target = '';
        var name = '';
      }

      var interpolated = {
        target: target
      };
      interpolated.name = name;
      return this.doRequest({
        url: this.url + '/search',
        data: interpolated,
        method: 'POST'
      }).then(this.mapToTextValue);
    }
  }, {
    key: "mapToTextValue",
    value: function mapToTextValue(result) {
      return _lodash["default"].map(result.data, function (d, i) {
        if (d && d.text && d.value) {
          return {
            text: d.text,
            value: d.value
          };
        } else if (_lodash["default"].isObject(d)) {
          return {
            text: d,
            value: i
          };
        }

        return {
          text: d,
          value: d
        };
      });
    }
  }, {
    key: "doRequest",
    value: function doRequest(options) {
      options.withCredentials = this.withCredentials;
      options.headers = this.headers;
      var result = this.backendSrv.datasourceRequest(options);
      return result;
    }
  }, {
    key: "buildQueryParameters",
    value: function buildQueryParameters(options) {
      var _this3 = this;

      //remove placeholder targets and undefined targets
      options.targets = _lodash["default"].filter(options.targets, function (target) {
        return target.target !== '' && typeof target.target !== 'undefined';
      });

      if (options.targets.length <= 0) {
        return options;
      }

      var from = new Date(options.range.from);
      var to = new Date(options.range.to);
      var range_msec = to.getTime() - from.getTime();

      var interval_sec = _lodash["default"].floor(range_msec / (options.maxDataPoints * 1000));

      var interval = "";

      if (interval_sec >= 1) {
        interval = String(interval_sec);
      }

      var targets = _lodash["default"].map(options.targets, function (target) {
        return {
          target: _this3.templateSrv.replace(target.target, options.scopedVars, 'regex'),
          refId: target.refId,
          hide: target.hide,
          alias: target.alias,
          operator: target.operator,
          from: from,
          to: to,
          interval: interval
        };
      });

      options.targets = targets;
      return options;
    }
  }]);

  return ArchiverapplianceDatasource;
}();

exports.ArchiverapplianceDatasource = ArchiverapplianceDatasource;
//# sourceMappingURL=datasource.js.map
