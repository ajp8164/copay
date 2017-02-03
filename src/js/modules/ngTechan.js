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
      if (!scope.data) {
        $log.error('[ngTechan] No data set specified');
        return;
      }

      // Check and setup options.
      var opts = lodash.cloneDeep(scope.options);

      var required = ['plot'];
      var diff = lodash.difference(required, Object.keys(opts));
      if (diff.length > 0) {
        $log.error('[ngTechan] Missing required options: ' + diff.toString());
        return;
      }

      // The css class is constrained to the plot name.
      opts.cssClass = opts.plot;

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
        var ti = opts.timeInterval.split('-');
        if (ti.length == 2) {
          opts.timeStep = ti[0];
          opts.timeInterval = intervals[ti[1]][1];
        } else if (ti.length == 1) {
          opts.timeStep = intervals[ti[0]][0];
          opts.timeInterval = intervals[ti[0]][1];
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
      var dataCache;

      // These plot allow area fill.
      var hasArea = ['close'].includes(opts.plot);

      // Setup svg.
      var svg = d3.select(elem[0]).append('svg');

      var chartWrapper = svg.append('g');

      var gridWrapper = chartWrapper.append('g')
        .attr('class', 'grid');

      var plotWrapper = chartWrapper.append('g')
        .attr('class', opts.cssClass);

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
      render(scope.data);

      // Watch it.
      scope.$watch('data', function(newData, oldData) {
        render(newData);
      }, true);

      // Render the chart on window resize.
      $window.addEventListener('resize', onResize);

      // Render the chart when asked.
      $rootScope.$on('ngTechan/Render', function(e) {
        $timeout(function() {
          render([]);
        });
      });

      function onResize() {
        render([]);
      };

      function render(data) {
        // Cache the data set and use it when no data is specified (as during window resize).
        if (data.length == 0) {
          data = dataCache;
        } else {
          dataCache = data;
        }

        updateDimensions();

        // Re-scale the axis.
        x = techan.scale.financetime().range([0, width]);
        y = d3.scaleLinear().range([height, 0]);

        var xAxis = d3.axisBottom(x);

        if (opts.timeFormat) {
          xAxis = xAxis.tickFormat(d3.timeFormat(opts.timeFormat));
        }
        if (opts.timeInterval) {
          xAxis = xAxis.ticks(d3[opts.timeInterval], opts.timeStep);
        }

        var yAxis = d3.axisLeft(y);

        var grid = d3.axisLeft(y)
          .tickFormat('')
          .tickSizeInner(-width)
          .tickSizeOuter(0)
          .tickPadding(10);

        // Select the plot generator for the chart.
        var plot;
        switch (opts.plot) {
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
        svg.selectAll('g.' + opts.cssClass).datum(data).call(plot);
        svg.selectAll('g.x.axis').call(xAxis);
        svg.selectAll('g.y.axis').call(yAxis);
        svg.selectAll('g.grid').call(grid);

        if (hasArea) {
          svg.selectAll('g.' + opts.cssClass + ' .area path').datum(data).attr('d', area);
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
        // Determine width using style preference
        if (!(cssWidth.includes('px') || cssWidth.includes('%'))) {
          cssWidth = '100%'; // default value for all other settings
        }

        if (cssWidth.includes('px')) {
          width = parseInt(cssWidth);
        } else if (cssWidth.includes('%')) {
          var containerRect = getContainerRect();
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
          var containerRect = getContainerRect();
          var percent = parseInt(cssHeight) / 100.0;
          height = containerRect.height * percent;
        }

        if (maxHeight) {
          height = Math.min(height, maxHeight);
        }
        height = height - margin.top - margin.bottom;
      };

      function getContainerRect() {
        var containerRect;
        if (elem[0].id != '') {
          containerRect = document.getElementById(elem[0].id).parentElement.getBoundingClientRect();
        } else {
          containerRect = document.querySelector(elem[0].nodeName).parentElement.getBoundingClientRect();
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
