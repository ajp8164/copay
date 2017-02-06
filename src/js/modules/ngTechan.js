angular.module('ngTechan',[
  'ng.techan'
]);

angular.module('ng.techan',[])

.directive('techan', function($rootScope, $log, $window, $timeout, lodash) {
	return {
		restrict : 'E',
		scope : {
      data: '=',
      options: '='
		},
		link : function(scope, elem, attr) {
      // Check inputs.
      var _data = scope.data || [];
      var _id = attr.id || Date.now(); // Create an id if not provided.

      // Check and setup options.
      var _opts = lodash.cloneDeep(scope.options);

      var required = ['plot'];
      var diff = lodash.difference(required, Object.keys(_opts));
      if (diff.length > 0) {
        $log.error('[ngTechan] Missing required options: ' + diff.toString());
        return;
      }

      // The css class is constrained to the plot name.
      _opts.cssClass = _opts.plot;

      var intervals = {
        'min'       : [ null, 'timeMinute' ],
        'day'       : [ null, 'timeDay' ],
        'hour'      : [ null, 'timeHour' ],
        'month'     : [ null, 'timeMonth' ],
        'week'      : [ null, 'timeWeek' ],
        'year'      : [ null, 'timeYear' ],
        'daily'     : [  '1', 'timeDay' ],
        'houly'     : [  '1', 'timeHour' ],
        'monthly'   : [  '1', 'timeMonth' ],
        'weekly'    : [  '1', 'timeWeek' ],
        'yearly'    : [  '1', 'timeYear' ],
        'monday'    : [  '1', 'timeMonday' ],
        'tuesday'   : [  '1', 'timeTuesday' ],
        'wednesday' : [  '1', 'timeWednesday' ],
        'thursday'  : [  '1', 'timeThursday' ],
        'friday'    : [  '1', 'timeFriday' ],
        'saturday'  : [  '1', 'timeSaturday' ],
        'sunday'    : [  '1', 'timeSunday' ]
      };

      try {
        var ti = _opts.timeInterval.split('-');
        if (ti.length == 2) {
          _opts.timeStep = ti[0];
          _opts.timeInterval = intervals[ti[1]][1];
        } else if (ti.length == 1) {
          _opts.timeStep = intervals[ti[0]][0];
          _opts.timeInterval = intervals[ti[0]][1];
        }
      } catch(e) {
        $log.error('[ngTechan] Unrecognized time interval: ' + scope.options.timeInterval);
        return;
      };

      // Initialize space.
      var margin = getMargin(elem);
      var maxWidth = (window.getComputedStyle(elem[0]).maxWidth != 'none' ? parseInt(window.getComputedStyle(elem[0]).maxWidth) : undefined);
      var maxHeight = (window.getComputedStyle(elem[0]).maxHeight != 'none' ? parseInt(window.getComputedStyle(elem[0]).maxHeight) : undefined);
      var cssWidth = window.getComputedStyle(elem[0]).width;
      var cssHeight = window.getComputedStyle(elem[0]).height;

      var width;
      var height;
      var x;
      var y;
      var dataCache = [];

      // These plot allow area fill.
      var hasArea = ['close'].includes(_opts.plot);

      // Setup svg.
      var svg = d3.select(elem[0]).append('svg');

      var chartWrapper = svg.append('g');

      var gridWrapper = chartWrapper.append('g')
        .attr('class', 'grid');

      var plotWrapper = chartWrapper.append('g')
        .attr('class', _opts.cssClass);

      if (hasArea) {
        var areaWrapper = plotWrapper.append('g')
          .attr('class', 'area')
          .append('path');
      }

      var xAxisWrapper = chartWrapper.append('g')
        .attr('class', 'x axis');

      var yAxisWrapper = chartWrapper.append('g')
        .attr('class', 'y axis');

      // Draw it.
      //$log.debug('Techan - init render()');
      render(_data);

      // Watch for data changes.
      scope.$watch('data', function(newData, oldData) {
        if (newData == oldData) return;
        //$log.debug('Techan - new data render()');
        render(newData);
      }, true);

      // Render when we are un-hidden (e.g., our width is changed).
      scope.$watch(function() {
        return {
          width: document.getElementById(_id).offsetWidth
        }
      }, function(newData, oldData) {
        if (!(newData.width > 0 && oldData.width == 0)) return;
        //$log.debug('Techan - unhidden render()');
        render();
      }, true);

      // Render the chart on window resize.
      $window.addEventListener('resize', onResize);

      // Render the chart when asked.
      $rootScope.$on('ngTechan/Render', function(e) {
        $timeout(function() {
          //$log.debug('Techan - requested to render()');
          render();
        });
      });

      function onResize() {
        //$log.debug('Techan - resize render()');
        render();
      };

      function render(data) {
        // Cache the data set and use it when no data is specified (as during window resize).
        // If there is no data then we just draw an empty chart.
        // Need to check and cache data prior to checking dimensions; it's possible to get a
        // data set but not be able to render the chart yet (e.g., on $watch()).
        data = data || [];
        if (data.length == 0) {
          data = dataCache;
          //$log.debug('Techan render: ' + _id + ' - reading from data cache');
        } else {
          dataCache = data;
          //$log.debug('Techan render: ' + _id + ' - set data cache');
        }

        // If we cannot get valid dimensions then there is nothing to do.
        // Can happen when render() is called on an event while we're out of DOM or hidden.
        if (!updateDimensions()) {
          //$log.debug('Techan render: ' + _id + ' - hidden (won\'t draw)');
          return;
        }

        //$log.debug('Techan render: ' + _id) + ' - drawing';

        // Re-scale the axis.
        x = techan.scale.financetime().range([0, width]);
        y = d3.scaleLinear().range([height, 0]);

        var xAxis = d3.axisBottom(x);

        if (_opts.timeFormat) {
          xAxis = xAxis.tickFormat(d3.timeFormat(_opts.timeFormat));
        }
        if (_opts.timeInterval) {
          xAxis = xAxis.ticks(d3[_opts.timeInterval], _opts.timeStep);
        }

        var yAxis = d3.axisLeft(y);

        var grid = d3.axisLeft(y)
          .tickFormat('')
          .tickSizeInner(-width)
          .tickSizeOuter(0)
          .tickPadding(10);

        // Select the plot generator for the chart.
        var plot;
        switch (_opts.plot) {
          case 'candlestick':
            plot = techan.plot.candlestick().xScale(x).yScale(y);
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.ohlc(data, plot.accessor()).domain()); // ohlc is correct here
            break;

          case 'ohlc':
            plot = techan.plot.ohlc().xScale(x).yScale(y);
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.ohlc(data, plot.accessor()).domain());
            break;

          case 'close':
            plot = techan.plot.close().xScale(x).yScale(y);
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.ohlc(data, plot.accessor()).domain()); // ohlc is correct here

            if (hasArea) {
              var area = d3.area()
                .x(function(d) { return x(d.date); })
                .y0(height)
                .y1(function(d) { return y(d.close); });
            }
            break;

          case 'macd':
            plot = techan.plot.macd().xScale(x).yScale(y);

            data = techan.indicator.macd()(data);
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.macd(data).domain());

            yAxis = d3.axisLeft(y)
              .tickFormat(d3.format(",.2s")); // Shorten format
            break;

          case 'volume':
            plot = techan.plot.volume().xScale(x).yScale(y).accessor(techan.accessor.ohlc()); // ohlc is correct here
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.volume(data, plot.accessor().v).domain());

            yAxis = d3.axisLeft(y)
              .tickFormat(d3.format(",.2s")); // Shorten format
            break;
        }

        // Update the data.
        svg.selectAll('g.' + _opts.cssClass).datum(data).call(plot);
        svg.selectAll('g.x.axis').call(xAxis);
        svg.selectAll('g.y.axis').call(yAxis);
        svg.selectAll('g.grid').call(grid);

        if (hasArea) {
          svg.selectAll('g.' + _opts.cssClass + ' .area path').datum(data).attr('d', area);
        }

        // Update svg elements to new dimensions.
        svg
          .attr('width', width + margin.right + margin.left)
          .attr('height', height + margin.top + margin.bottom);

        chartWrapper
          .attr('transform', 'translate(' + margin.left + ',' + 0 + ')');

        xAxisWrapper
          .attr('transform', 'translate(0,' + height + ')');
      };

      function updateDimensions() {
        var containerRect = getContainerRect();
        if (!containerRect || containerRect.width == 0 || containerRect.height == 0) {
          return false;
        }

        // Determine width using style preference
        if (!(cssWidth.includes('px') || cssWidth.includes('%'))) {
          cssWidth = '100%'; // default value for all other settings
        }

        if (cssWidth.includes('px')) {
          width = parseInt(cssWidth);
        } else if (cssWidth.includes('%')) {
          var percent = parseInt(cssWidth) / 100.0;
          width = containerRect.width * percent;
        }

        if (maxWidth) {
          width = Math.min(width, maxWidth);
        }
        width = width - margin.left - margin.right;

        // Determine height using style preference
        if (!(cssHeight.includes('px') || cssHeight.includes('%'))) {
          cssHeight = '100%'; // default value for all other settings
        }

        if (cssHeight.includes('px')) {
          height = parseInt(cssHeight);
        } else if (cssHeight.includes('%')) {
          var percent = parseInt(cssHeight) / 100.0;
          height = containerRect.height * percent;
        }

        if (maxHeight) {
          height = Math.min(height, maxHeight);
        }
        height = height - margin.top - margin.bottom;

        return true;
      };

      function getContainerRect() {
        var containerRect = undefined;
        try {
          containerRect = document.getElementById(_id).parentElement.getBoundingClientRect();
        } catch(e) {
          // Likely the document query for the elem failed.
          // Can happen when render() is called while we're ouf of DOM or hidden.
          // Silently return undefined.
        }
        return containerRect;
      };

      function getMargin(elem) {
        var margin = {
          top: parseInt(window.getComputedStyle(elem[0]).marginTop) || 0,
          right: parseInt(window.getComputedStyle(elem[0]).marginRight) || 0,
          left: parseInt(window.getComputedStyle(elem[0]).marginLeft) || 0,
          bottom: parseInt(window.getComputedStyle(elem[0]).marginBottom) || 0
        };

        // Removes margin from containing element. Value is used on chart svg.
        elem[0].style.marginTop = '0';
        elem[0].style.marginRight = '0';
        elem[0].style.marginLeft = '0';
        elem[0].style.marginBottom = '0';

        return margin;
      }
    }
	}
});
