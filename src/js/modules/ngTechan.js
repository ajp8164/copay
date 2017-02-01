angular.module('ngTechan',[
  'ng.techan'
]);

angular.module('ng.techan',[])

.directive('techan', function($window) {
	return {
		restrict : 'E',
		scope : {
      data: '=',
      options: '='
		},
		link : function(scope, elem, attr) {
      // Initialize space
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

      // Initialize svg
      var svg = d3.select(elem[0]).append('svg');

      var chartWrapper = svg.append('g');

      var plotWrapper = chartWrapper.append('g')
        .attr('class', scope.options.cssClass);

      var xAxisWrapper = chartWrapper.append('g')
        .attr('class', 'x axis');

      var yAxisWrapper = chartWrapper.append('g')
        .attr('class', 'y axis')
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('Price ($)');

      render(scope.data);

      scope.$watch('data', function(newData, oldData) {
        render(newData);
      });

      $window.addEventListener('resize', onResize);

      function onResize() {
        render([]);
      };

      function render(data) {
        console.log('render techan chart');

        if (data.length == 0) {
          data = dataCache;
        } else {
          dataCache = data;
        }

        updateDimensions();

        // Re-scale the axis
        x = techan.scale.financetime().range([0, width]);
        y = d3.scaleLinear().range([height, 0]);

        var xAxis = d3.axisBottom(x);
        var yAxis = d3.axisLeft(y);

        // The plot generator for the chart
        var plot;
        switch (scope.options.plot) {
          case 'ohlc':
            plot = techan.plot.ohlc().xScale(x).yScale(y);
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.ohlc(data, plot.accessor()).domain());
            break;

          case 'close':
            plot = techan.plot.close().xScale(x).yScale(y);
            x.domain(data.map(plot.accessor().d));
            y.domain(techan.scale.plot.ohlc(data, plot.accessor()).domain()); // ohlc is correct here
            break;
        }

        // Update the data
        svg.selectAll('g.' + scope.options.cssClass).datum(data).call(plot);
        svg.selectAll('g.x.axis').call(xAxis);
        svg.selectAll('g.y.axis').call(yAxis);

        // Update svg elements to new dimensions
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
