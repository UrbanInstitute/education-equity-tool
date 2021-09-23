var widthChart = document.getElementById("chart").offsetWidth;

var margin = { top: 60, right: 50, bottom: 30, left: 0},
width = widthChart - margin.left - margin.right,
height = 550 - margin.top - margin.bottom;

d3.selection.prototype.moveToFront = function() {
return this.each(function(){
  this.parentNode.appendChild(this);
});
};

d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

function drawChart(states, districts) {

  states.forEach(function(d) {
    d.pct = +d.pct
  })

  var nestedData = d3.nest()
  .key(function(d) {
    return d.metrics
  })
  .entries(states)

  var xScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, width])

  var yScale = d3.scalePoint()
    .domain(states.map(function(d) {
      return d.race_eth
    }))
    .range([15, height])
    .padding(0.55)

  var svgs = d3.select("#chart")
  .selectAll("svg")
  .data(nestedData)

  svgs.exit()
  .remove()

  enterSvgs = svgs.enter()
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")

  svgs = enterSvgs.merge(svgs)
  .attr("id", function(d) {
    return d.key;
  })

  var dots = svgs.selectAll("dots")
    .data(function(d, i) {
      var min = d3.min(d.values, function(d) {
        return d.pct;
      })
      var max = d3.max(d.values, function(d) {
        return d.pct;
      })

    return d.values
    })
  .enter()
  .append("circle")
  .attr("r", 5)
  .attr("cy", function(d) {
    return yScale(d.race_eth)
  })
  .attr("cx", function(d) {
    return xScale(d.pct)
  })
  .attr("class", function(d) {
    return d.STUSPS
  })
  .attr("fill", "#d2d2d2")
  .attr("stroke", "black")
  .attr("pointer-events", "all")
  .style("opacity", 0.5)


  // axis

  var axisLeft = d3.axisLeft()
  .scale(yScale)

  var yAxis = svgs.selectAll("g.yAxis")
    .data([nestedData])

    yAxis
    .enter()
    .append("g")
    .attr("class", "yAxis")
    .call(axisLeft)
    .call(function(t) {
      t.selectAll("text")
      .attr("x", 0)
      .attr("dy", "-17")
      .style("text-anchor", "start")
      t.select(".domain").remove()
      t.selectAll("line")
        .attr("x2", width)
        .attr("stroke-opacity", 0.1)
    })

    var axisBottom = d3.axisBottom()
    .scale(xScale)

    var xAxis = svgs.selectAll("g.xAxis")
      .data([nestedData])

      xAxis
      .enter()
      .append("g")
      .attr("class", "xAxis")
      .attr("transform", "translate(0," + (height - (margin.bottom + 3))+ ")")
      .call(axisBottom)
      .call(function(t) {
        t.select(".domain").remove()
        t.selectAll("line")
          .attr("dy", "-15")
      })

} //drawChart ends here

function highlightStates(thisState) {
  var allSvg = d3.selectAll("svg");
  var thisDots = "circle." + thisState;
  var dotsState = allSvg.selectAll(thisDots)

  dotsState
  .attr("fill", "blue")
  .attr("r", 10)

  dotsState.moveToFront();
}

function getUniquesMenu(df, thisVariable) {

  var thisList = df.map(function(o) {
    return o[thisVariable]
    })

    // uniq() found here https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
    function uniq(a) {
        return a.filter(function(item, pos, ary) {
            return !pos || item != ary[pos - 1];
        });
    }

    var uniqueList = uniq(thisList);

    return uniqueList;
}


Promise.all([
  d3.csv('data/EDP-preliminary-by-state.csv'),
  d3.csv('data/EDP-preliminary-by-district.csv')
]).then(function(data) {
  var states = data[0]
  var districts = data[1]

  var statesMenu = getUniquesMenu(states, "STUSPS");

  drawChart(states, districts)

  $("#menuState").autocomplete({
  source: statesMenu,
  select: function(event, ui) {
    var selectedState  = ui.item.value;
    highlightStates(selectedState)
  }
});
})
